use crate::{Code, Stroke, numerics::Axis};
use linefield_editor_geometry::{Flatten, Point, span};
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct PageKey {
    pub stroke: u64,
    pub chunk: u64,
    pub revision: u64,
    pub detail: f64,
    pub ordinal: u64,
}
pub(crate) struct Continuation {
    pub key: PageKey,
    pub token: u64,
    pub anchor: [Axis; 2],
    pub destination: usize,
    pub end: usize,
    pub flatten: Option<Flatten>,
    pub pending: Option<[Point; 2]>,
}
impl Continuation {
    pub fn next(&mut self, stroke: &Stroke) -> Result<Option<[Point; 2]>, Code> {
        if let Some(pair) = self.pending.take() {
            return Ok(Some(pair));
        }
        loop {
            if let Some(flatten) = &mut self.flatten {
                if let Some(pair) = flatten
                    .next_capsule()
                    .map_err(|_| Code::NumericalCapacity)?
                {
                    return Ok(Some(pair));
                }
                self.flatten = None;
            }
            if self.destination >= self.end {
                return Ok(None);
            }
            let i = self.destination;
            let point = |index: usize| -> Result<Point, Code> {
                let p = stroke.samples.get(index).ok_or(Code::Invalid)?;
                Ok([
                    p.position[0].relative(self.anchor[0])?,
                    p.position[1].relative(self.anchor[1])?,
                    stroke.style.radius(p),
                ])
            };
            let b = point(i)?;
            let curve = if i == 0 {
                [b; 4]
            } else {
                span(
                    if i > 1 { Some(point(i - 2)?) } else { None },
                    point(i - 1)?,
                    b,
                    if i + 1 < stroke.samples.len {
                        Some(point(i + 1)?)
                    } else {
                        None
                    },
                )
            };
            self.flatten = Some(Flatten::new(
                curve,
                0.08 / self.key.detail,
                4096.0_f64.min(4096.0 / self.key.detail),
            ));
            self.destination += 1;
        }
    }
}
