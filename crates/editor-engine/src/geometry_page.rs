use crate::geometry_cursor::{Continuation, PageKey};
use crate::scene::{Descriptor, Page};
use crate::{Code, Engine, numerics::normalize};
impl Engine {
    #[expect(
        clippy::too_many_arguments,
        reason = "MIG-C1 named typed command/query parameters"
    )]
    pub fn geometry_page(
        &mut self,
        owner: u64,
        session: u64,
        scene: u64,
        id: u64,
        revision: u64,
        chunk: u64,
        detail: f64,
        cursor: u64,
    ) -> Result<Page, Code> {
        self.stroke_info(owner, session, scene, id)?;
        let metrics = self
            .current
            .and_then(|v| v.metrics)
            .ok_or(Code::Unavailable)?;
        if !detail.is_finite()
            || !(0.01..=128.0).contains(&detail)
            || detail < self.document.view.zoom * metrics.backing
        {
            return Err(Code::Invalid);
        }
        let stroke = self.document.stroke(id).ok_or(Code::StaleScene)?;
        let start = usize::try_from(chunk)
            .ok()
            .and_then(|n| n.checked_mul(128))
            .ok_or(Code::Invalid)?;
        if start >= stroke.samples.len {
            return Err(Code::Invalid);
        }
        let end = start.saturating_add(128).min(stroke.samples.len);
        let actual = stroke.samples.len.min(start.saturating_add(129)) as u64;
        if revision != actual {
            return Err(Code::StaleScene);
        }
        let mut data = Vec::new();
        data.try_reserve_exact(6144).map_err(|_| Code::Capacity)?;
        let mut continuation = if cursor == 0 {
            Continuation {
                key: PageKey {
                    stroke: id,
                    chunk,
                    revision,
                    detail,
                    ordinal: 0,
                },
                token: 0,
                anchor: stroke.samples.get(start).ok_or(Code::Invalid)?.position,
                destination: start,
                end,
                flatten: None,
                pending: None,
            }
        } else {
            let c = self.continuation.as_ref().ok_or(Code::Invalid)?;
            if c.token != cursor
                || c.key.stroke != id
                || c.key.chunk != chunk
                || c.key.revision != revision
                || c.key.detail != detail
            {
                return Err(Code::Invalid);
            }
            self.continuation.take().ok_or(Code::Invalid)?
        };
        let key = continuation.key;
        let mut origin = None;
        let mut bounds = [
            f64::INFINITY,
            f64::INFINITY,
            f64::NEG_INFINITY,
            f64::NEG_INFINITY,
        ];
        let mut done = true;
        let mut centers = bounds;
        while let Some(pair) = continuation.next(stroke)? {
            let o = *origin.get_or_insert([pair[0][0], pair[0][1]]);
            if data.len() == 6144
                || pair.iter().any(|p| {
                    (p[0] - o[0]).abs() > crate::geometry_precision::page_extent(detail)
                        || (p[1] - o[1]).abs() > crate::geometry_precision::page_extent(detail)
                })
            {
                continuation.pending = Some(pair);
                done = false;
                break;
            }
            for p in pair {
                let values = [p[0] - o[0], p[1] - o[1], p[2]];
                centers[0] = centers[0].min(values[0]);
                centers[1] = centers[1].min(values[1]);
                centers[2] = centers[2].max(values[0]);
                centers[3] = centers[3].max(values[1]);
                bounds[0] = bounds[0].min(values[0] - values[2]);
                bounds[1] = bounds[1].min(values[1] - values[2]);
                bounds[2] = bounds[2].max(values[0] + values[2]);
                bounds[3] = bounds[3].max(values[1] + values[2]);
                for v in values {
                    let f = v as f32;
                    if !f.is_finite() || (v - f as f64).abs() * detail > 0.01 {
                        return Err(Code::NumericalCapacity);
                    }
                    data.push(f);
                }
            }
        }
        if data.is_empty() {
            return Err(Code::Invalid);
        }
        let o = origin.ok_or(Code::Invalid)?;
        let origin = [
            normalize(continuation.anchor[0], o[0], 0.0, 1.0, 1_048_576)?,
            normalize(continuation.anchor[1], o[1], 0.0, 1.0, 1_048_576)?,
        ];
        let style = stroke.style;
        let page = if let Some(p) = self.pages.iter().find(|p| p.key == key) {
            p.id
        } else {
            if self.pages.len() >= 4096 {
                return Err(Code::Capacity);
            }
            let id = self.page_counter.checked_add(1).ok_or(Code::Exhausted)?;
            self.pages.try_reserve(1).map_err(|_| Code::Capacity)?;
            self.pages.push(Descriptor {
                id,
                key,
                origin,
                bounds,
                centers,
            });
            self.page_counter = id;
            id
        };
        let next = if done {
            self.continuation = None;
            0
        } else {
            let token = self
                .continuation_counter
                .checked_add(1)
                .ok_or(Code::Exhausted)?;
            continuation.token = token;
            continuation.key.ordinal += 1;
            self.continuation = Some(continuation);
            self.continuation_counter = token;
            token
        };
        Ok(Page {
            data,
            origin,
            next,
            done,
            page,
            revision,
            style,
        })
    }
}
