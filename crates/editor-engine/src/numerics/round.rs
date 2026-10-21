//! N1: exact binary64 input division, then nearest-even regional normalization.
use super::magnitude::Magnitude;
use crate::Code;
pub(super) fn round(numerator: Magnitude, denominator: Magnitude) -> Result<f64, Code> {
    if numerator.width() == 0 {
        return Ok(0.0);
    }
    let mut exponent = numerator.width() as i32 - denominator.width() as i32;
    let comparison = if exponent >= 0 {
        numerator.compare(denominator.shift(exponent as usize)?)
    } else {
        numerator.shift((-exponent) as usize)?.compare(denominator)
    };
    if comparison.is_lt() {
        exponent -= 1;
    }
    let scale = (exponent - 52).max(-1074);
    let (mut significand, mut remainder) = numerator.divide(denominator)?;
    for _ in 0..-scale {
        remainder = remainder.shift(1)?;
        significand = significand.checked_mul(2).ok_or(Code::NumericalCapacity)?;
        if remainder.compare(denominator).is_ge() {
            remainder = remainder.subtract(denominator)?;
            significand |= 1;
        }
    }
    let comparison = remainder.shift(1)?.compare(denominator);
    if comparison.is_gt() || (comparison.is_eq() && significand & 1 != 0) {
        significand = significand.checked_add(1).ok_or(Code::NumericalCapacity)?;
    }
    Ok(if scale == -1074 {
        f64::from_bits(significand)
    } else {
        f64::from_bits((((scale + 1075) as u64) << 52) + significand - (1_u64 << 52))
    })
}
