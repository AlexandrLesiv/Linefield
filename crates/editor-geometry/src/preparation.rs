use crate::{Bounds, Flatten, Point, compact::compact, span};
pub struct PreparedPage {
    pub data: Vec<f32>,
    pub origin: [f64; 2],
    pub bounds: Bounds,
    pub centers: Bounds,
    pub done: bool,
}
pub struct Preparation {
    points: Vec<Point>,
    pub(crate) next: usize,
    pub(crate) end: usize,
    pub(crate) detail: f64,
    clip: Option<Bounds>,
    pub(crate) flatten: Option<Flatten>,
    polygon: Vec<Point>,
    pub(crate) compacted: Vec<[Point; 2]>,
    pub(crate) output: usize,
    pub(crate) pending: Option<[Point; 2]>,
}
impl Preparation {
    pub fn new(
        points: &[Point],
        first: usize,
        end: usize,
        detail: f64,
        clip: Option<Bounds>,
    ) -> Result<Self, &'static str> {
        if points.is_empty()
            || points.len() > 132
            || first >= end
            || end > points.len()
            || !detail.is_finite()
            || !(0.01..=128.0).contains(&detail)
            || points.iter().flatten().any(|v| !v.is_finite())
            || points.iter().any(|p| p[2] < 0.0 || p[2] > 256_000.0)
            || clip.is_some_and(|b| b.iter().any(|v| !v.is_finite()) || b[0] > b[2] || b[1] > b[3])
        {
            return Err("invalid");
        }
        let mut owned = Vec::new();
        owned
            .try_reserve_exact(points.len())
            .map_err(|_| "capacity")?;
        owned.extend_from_slice(points);
        let mut polygon = Vec::new();
        polygon.try_reserve_exact(65).map_err(|_| "capacity")?;
        let mut compacted = Vec::new();
        compacted.try_reserve_exact(64).map_err(|_| "capacity")?;
        Ok(Self {
            points: owned,
            next: first,
            end,
            detail,
            clip,
            flatten: None,
            polygon,
            compacted,
            output: 0,
            pending: None,
        })
    }
    fn raw(&mut self, work: &mut usize) -> Result<Option<[Point; 2]>, &'static str> {
        loop {
            if let Some(f) = &mut self.flatten {
                if let Some(pair) = f.step(work).map_err(|_| "numerical-capacity")? {
                    return Ok(Some(pair));
                }
                if f.pending() {
                    return Ok(None);
                }
                self.flatten = None;
            }
            if self.next == self.end || *work == 0 {
                return Ok(None);
            }
            *work -= 1;
            let i = self.next;
            self.next += 1;
            let b = self.points[i];
            let curve = if i == 0 {
                [b; 4]
            } else {
                span(
                    i.checked_sub(2).map(|j| self.points[j]),
                    self.points[i - 1],
                    b,
                    self.points.get(i + 1).copied(),
                )
            };
            self.flatten = Some(
                Flatten::new(
                    curve,
                    0.04 / self.detail,
                    4096.0_f64.min(4096.0 / self.detail),
                )
                .clipped(self.clip),
            );
        }
    }
    pub(crate) fn capsule(&mut self, work: &mut usize) -> Result<Option<[Point; 2]>, &'static str> {
        if self.output < self.compacted.len() {
            let pair = self.compacted[self.output];
            self.output += 1;
            return Ok(Some(pair));
        }
        self.polygon.clear();
        while self.polygon.len() < 65 {
            let pair = if let Some(p) = self.pending.take() {
                Some(p)
            } else {
                self.raw(work)?
            };
            let Some(pair) = pair else {
                break;
            };
            let dab = pair[0][0] == pair[1][0] && pair[0][1] == pair[1][1];
            if (dab && !self.polygon.is_empty())
                || self.polygon.last().is_some_and(|p| *p != pair[0])
            {
                self.pending = Some(pair);
                break;
            }
            if self.polygon.is_empty() {
                self.polygon.push(pair[0]);
            }
            self.polygon.push(pair[1]);
            if dab {
                break;
            }
        }
        compact(
            &self.polygon,
            0.04 / self.detail,
            4096.0_f64.min(4096.0 / self.detail),
            &mut self.compacted,
        );
        self.output = 0;
        if self.compacted.is_empty() {
            return Ok(None);
        }
        let pair = self.compacted[0];
        self.output = 1;
        Ok(Some(pair))
    }
}
