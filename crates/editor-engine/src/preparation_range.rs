use crate::{Code, Engine, PreparationInput, geometry_cursor::PageKey, preparation::Ticket};
use linefield_editor_geometry::{bounds, intersects, span};
impl Engine {
    #[expect(
        clippy::too_many_arguments,
        reason = "bounded immutable source interval issuance"
    )]
    pub(crate) fn prepare_range(
        &mut self,
        stroke: u64,
        chunk: u64,
        revision: u64,
        detail: f64,
        v: crate::numerics::Viewport,
        m: crate::Metrics,
        start: usize,
        end: usize,
        proof: crate::source_proof::SourceProof,
    ) -> Result<PreparationInput, Code> {
        let source = self.document.stroke(stroke).ok_or(Code::StaleScene)?;
        let base = start.saturating_sub(2);
        let anchor = source.samples.get(start).ok_or(Code::Invalid)?.position;
        let mut points = Vec::new();
        points.try_reserve_exact(132).map_err(|_| Code::Capacity)?;
        for i in base..(end + 1).min(source.samples.len) {
            let p = source.samples.get(i).ok_or(Code::Invalid)?;
            points.push([
                p.position[0].relative(anchor[0])?,
                p.position[1].relative(anchor[1])?,
                source.style.radius(p),
            ]);
        }
        let mut hull = [
            f64::INFINITY,
            f64::INFINITY,
            f64::NEG_INFINITY,
            f64::NEG_INFINITY,
        ];
        for i in start - base..end - base {
            let b = points[i];
            let curve = if i == 0 {
                [b; 4]
            } else {
                span(
                    i.checked_sub(2).map(|j| points[j]),
                    points[i - 1],
                    b,
                    points.get(i + 1).copied(),
                )
            };
            let b = bounds(&curve);
            for k in 0..2 {
                hull[k] = hull[k].min(b[k]);
                hull[k + 2] = hull[k + 2].max(b[k + 2]);
            }
        }
        let viewport = match Self::coverage_bounds(v, m, anchor, 2.0 / detail) {
            Ok(v) => v,
            Err(Code::CoordinateOverflow) => {
                return Ok(PreparationInput {
                    token: 0,
                    points: Vec::new(),
                    first: 0,
                    end: 0,
                    detail,
                    clip: None,
                    through: end as u64,
                });
            }
            Err(e) => return Err(e),
        };
        if !intersects(hull, viewport) {
            return Ok(PreparationInput {
                token: 0,
                points: Vec::new(),
                first: 0,
                end: 0,
                detail,
                clip: None,
                through: end as u64,
            });
        }
        // Ordinary compact chunks stay view-independent. Only broad sources are clipped.
        let clip = if (hull[2] - hull[0]).max(hull[3] - hull[1]) * detail > 8192.0 {
            Some(Self::coverage_bounds(
                v,
                m,
                anchor,
                256.0 / v.zoom + 2.0 / detail,
            )?)
        } else {
            None
        };
        if self.preparations.len() >= 256 {
            return Err(Code::Capacity);
        }
        let token = self
            .preparation_counter
            .checked_add(1)
            .ok_or(Code::Exhausted)?;
        self.preparations
            .try_reserve(1)
            .map_err(|_| Code::Capacity)?;
        self.preparations.push(Ticket {
            token,
            key: PageKey {
                stroke,
                chunk,
                revision,
                detail,
                ordinal: 0,
            },
            anchor,
            clip,
            complete: false,
            hull,
            ordinal: 0,
            proof,
        });
        self.preparation_counter = token;
        Ok(PreparationInput {
            token,
            points,
            first: start - base,
            end: end - base,
            detail,
            clip,
            through: end as u64,
        })
    }
}
