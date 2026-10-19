//! Reviewed nearest-binary64 table; exact cardinal values and quadrant symmetry.
use super::magnitude::{Magnitude, Signed};
use crate::Code;
pub fn coefficients(step: u8) -> [f64; 2] {
    const S: f64 = f64::from_bits(0x3fd0907dc1930690);
    const D: f64 = f64::from_bits(0x3fe6a09e667f3bcd);
    const T: f64 = f64::from_bits(0x3febb67ae8584caa);
    const C: f64 = f64::from_bits(0x3feee8dd4748bf15);
    let [c, s] = [[1.0, 0.0], [C, S], [T, 0.5], [D, D], [0.5, T], [S, C]][usize::from(step % 6)];
    match step / 6 {
        0 => [c, s],
        1 => [-s, c],
        2 => [-c, -s],
        _ => [s, -c],
    }
}
pub(super) fn determinant([c, s]: [f64; 2]) -> u128 {
    let c = (c.abs() * 2_f64.powi(54)) as u128;
    let s = (s.abs() * 2_f64.powi(54)) as u128;
    c * c + s * s
}
pub(super) fn weighted(value: Signed, coefficient: f64) -> Result<Signed, Code> {
    if coefficient == 0.0 {
        return Ok((false, Magnitude::small(0)));
    }
    let bits = coefficient.to_bits();
    let exponent = ((bits >> 52) & 2047) as i32 - 1023 - 52;
    if !(-54..=-52).contains(&exponent) {
        return Err(Code::NumericalCapacity);
    }
    let mantissa = (bits & ((1_u64 << 52) - 1)) | (1_u64 << 52);
    Ok((
        value.0 != (bits >> 63 != 0),
        value
            .1
            .multiply(mantissa)?
            .shift((exponent + 54) as usize)?,
    ))
}
