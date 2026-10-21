use crate::{Curve, Point};
const EMPTY: Curve = [[0.0; 3]; 4];
#[derive(Debug)]
pub struct NumericalCapacity;
pub struct Flatten {
    stack: [Curve; 64],
    len: usize,
    tolerance: f64,
    max_span: f64,
}
fn midpoint(a: Point, b: Point) -> Point {
    std::array::from_fn(|i| a[i] * 0.5 + b[i] * 0.5)
}
fn error(p: Point, a: Point, b: Point) -> f64 {
    let dx = b[0] - a[0];
    let dy = b[1] - a[1];
    let length = dx * dx + dy * dy;
    let t = if length > 0.0 {
        (((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / length).clamp(0.0, 1.0)
    } else {
        0.0
    };
    (p[0] - (a[0] + dx * t)).hypot(p[1] - (a[1] + dy * t))
        + (p[2] - (a[2] + (b[2] - a[2]) * t)).abs()
}
impl Flatten {
    pub fn new(curve: Curve, tolerance: f64, max_span: f64) -> Self {
        let mut value = Self {
            stack: [EMPTY; 64],
            len: 1,
            tolerance,
            max_span,
        };
        value.stack[0] = curve;
        value
    }
    pub fn next_capsule(&mut self) -> Result<Option<[Point; 2]>, NumericalCapacity> {
        while self.len > 0 {
            self.len -= 1;
            let c = self.stack[self.len];
            if (c[3][0] - c[0][0]).abs().max((c[3][1] - c[0][1]).abs()) <= self.max_span
                && error(c[1], c[0], c[3]).max(error(c[2], c[0], c[3])) <= self.tolerance
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
