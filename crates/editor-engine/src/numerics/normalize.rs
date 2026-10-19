//! N1: exact binary64 input division, then nearest-even regional normalization.
use super::Axis;
use super::magnitude::{Magnitude, decode, signed_add};
use crate::Code;
fn round(numerator: Magnitude, denominator: Magnitude) -> Result<f64, Code> {
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
pub fn normalize(center: Axis, a: f64, b: f64, zoom: f64, limit: u64) -> Result<Axis, Code> {
    if !center.local.is_finite()
        || !(0.0..65536.0).contains(&center.local)
        || !a.is_finite()
        || !b.is_finite()
        || a.abs() > 16384.0
        || b.abs() > 16384.0
        || !zoom.is_finite()
        || !(0.1..=8.0).contains(&zoom)
    {
        return Err(Code::Invalid);
    }
    let (sign_b, mag_b) = decode(b)?;
    let (negative, difference) = signed_add(decode(a)?, (!sign_b, mag_b))?;
    if difference
        .compare(Magnitude::small(limit).shift(1074)?)
        .is_gt()
    {
        return Err(Code::Invalid);
    }
    let bits = zoom.to_bits();
    let mantissa = (bits & ((1_u64 << 52) - 1)) | (1_u64 << 52);
    let exponent = ((bits >> 52) & 2047) as i32 - 1023 - 52;
    let denominator = Magnitude::small(mantissa).shift(1074)?;
    let (negative, numerator) = signed_add(
        (false, decode(center.local)?.1.multiply(mantissa)?),
        (negative, difference.shift((-exponent) as usize)?),
    )?;
    let regional = denominator.shift(16)?;
    let (whole, mut remainder) = numerator.divide(regional)?;
    let mut delta = i128::from(whole);
    if negative {
        delta = -delta;
        if remainder.width() != 0 {
            delta -= 1;
            remainder = regional.subtract(remainder)?;
        }
    }
    let mut region =
        i64::try_from(i128::from(center.region) + delta).map_err(|_| Code::CoordinateOverflow)?;
    let mut local = round(remainder, denominator)?;
    if local == 65536.0 {
        region = region.checked_add(1).ok_or(Code::CoordinateOverflow)?;
        local = 0.0;
    }
    Ok(Axis { region, local })
}
