use crate::integer::Integer;
#[derive(Clone, Copy, Default)]
pub(crate) struct Point(pub [Integer; 3]);
fn scalar(value: f32, scale: usize) -> Option<Integer> {
    if !value.is_finite() || value.abs() >= 2_f32.powi(23) {
        return None;
    }
    let bits = value.to_bits();
    let exponent = (bits >> 23) & 255;
    let fraction = bits & 0x7f_ffff;
    let (mantissa, power) = if exponent == 0 {
        (fraction, -149)
    } else {
        (fraction | 0x80_0000, exponent as i32 - 150)
    };
    let shift = usize::try_from(power + scale as i32).ok()?;
    Integer::from_parts(u64::from(mantissa), shift, bits >> 31 != 0)
}
impl Point {
    pub fn new(x: f32, y: f32, weighted: bool) -> Option<Self> {
        if weighted {
            let weight =
                u64::from(std::f32::consts::FRAC_1_SQRT_2.to_bits() & 0x7f_ffff) | (1 << 23);
            let multiplier = Integer::from_parts(weight, 0, false)?;
            Some(Self([
                scalar(x, 165)?.multiply(multiplier)?,
                scalar(y, 165)?.multiply(multiplier)?,
                Integer::from_parts(weight, 165, false)?,
            ]))
        } else {
            Some(Self([
                scalar(x, 189)?,
                scalar(y, 189)?,
                Integer::from_parts(1, 189, false)?,
            ]))
        }
    }
    pub fn midpoint(self, other: Self) -> Option<Self> {
        Some(Self([
            self.0[0].add(other.0[0])?.half()?,
            self.0[1].add(other.0[1])?.half()?,
            self.0[2].add(other.0[2])?.half()?,
        ]))
    }
}
pub(crate) fn orientation(a: Point, b: Point, c: Point) -> Option<Integer> {
    let product = |i: usize, j: usize, k: usize| a.0[i].multiply(b.0[j])?.multiply(c.0[k]);
    let positive = product(0, 1, 2)?
        .add(product(1, 2, 0)?)?
        .add(product(2, 0, 1)?)?;
    let negative = product(2, 1, 0)?
        .add(product(1, 0, 2)?)?
        .add(product(0, 2, 1)?)?;
    positive.add(negative.negate())
}
pub(crate) fn split(points: [Point; 3]) -> Option<([Point; 3], [Point; 3])> {
    let a = points[0].midpoint(points[1])?;
    let b = points[1].midpoint(points[2])?;
    let m = a.midpoint(b)?;
    Some(([points[0], a, m], [m, b, points[2]]))
}
