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
        let packed = crate::geometry_packing::pack(&mut continuation, stroke, detail)?;
        let o = packed.origin;
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
                proof: crate::source_proof::SourceProof::Chunk,
                id,
                key,
                origin,
                bounds: packed.bounds,
                centers: packed.centers,
            });
            self.page_counter = id;
            id
        };
        let next = if packed.done {
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
            data: packed.data,
            origin,
            next,
            done: packed.done,
            page,
            revision,
            style,
        })
    }
}
