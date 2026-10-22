use crate::bounds::edge_error;
use crate::{Bounds, Curve, Point, bounds, intersects};
const EMPTY: Curve = [[0.0; 3]; 4];
#[derive(Debug)]
pub struct NumericalCapacity;
pub struct Flatten {
    stack: [Curve; 64],
    len: usize,
    tolerance: f64,
    max_span: f64,
    clip: Option<Bounds>,
}
fn midpoint(a: Point, b: Point) -> Point {
    std::array::from_fn(|i| a[i] * 0.5 + b[i] * 0.5)
}
impl Flatten {
    pub fn new(curve: Curve, tolerance: f64, max_span: f64) -> Self {
        let mut value = Self {
            stack: [EMPTY; 64],
            len: 1,
            tolerance,
            max_span,
            clip: None,
        };
        value.stack[0] = curve;
        value
    }
    pub fn clipped(mut self, clip: Option<Bounds>) -> Self {
        self.clip = clip;
        self
    }
    pub fn pending(&self) -> bool {
        self.len > 0
    }
    pub fn next_capsule(&mut self) -> Result<Option<[Point; 2]>, NumericalCapacity> {
        let mut budget = usize::MAX;
        self.step(&mut budget)
    }
    pub fn step(&mut self, budget: &mut usize) -> Result<Option<[Point; 2]>, NumericalCapacity> {
        while self.len > 0 && *budget > 0 {
            *budget -= 1;
            self.len -= 1;
            let c = self.stack[self.len];
            if self.clip.is_some_and(|clip| !intersects(bounds(&c), clip)) {
                continue;
            }
            if (c[3][0] - c[0][0]).abs().max((c[3][1] - c[0][1]).abs()) <= self.max_span
                && edge_error(c[1], c[0], c[3]).max(edge_error(c[2], c[0], c[3])) <= self.tolerance
            {
                return Ok(Some([c[0], c[3]]));
            }
            if self.len + 2 > self.stack.len() {
                return Err(NumericalCapacity);
            }
            let ab = midpoint(c[0], c[1]);
            let bc = midpoint(c[1], c[2]);
            let cd = midpoint(c[2], c[3]);
            let abc = midpoint(ab, bc);
            let bcd = midpoint(bc, cd);
            let m = midpoint(abc, bcd);
            if m == c[0] || m == c[3] {
                return Err(NumericalCapacity);
            }
            self.stack[self.len] = [m, bcd, cd, c[3]];
            self.stack[self.len + 1] = [c[0], ab, abc, m];
            self.len += 2;
        }
        Ok(None)
    }
}
