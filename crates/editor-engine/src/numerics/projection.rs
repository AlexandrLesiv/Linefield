//! Exact regional painted-AABB classification precedes bounded floating projection.
use super::Axis;
use super::magnitude::{Magnitude, Signed, decode, larger, signed_add};
use crate::Code;
fn relative(point: Axis, center: Axis) -> Result<Signed, Code> {
    let delta = i128::from(point.region) - i128::from(center.region);
    let regional = (
        delta < 0,
        Magnitude::small(u64::try_from(delta.unsigned_abs()).map_err(|_| Code::NumericalCapacity)?)
            .shift(1090)?,
    );
    signed_add(
        signed_add(regional, decode(point.local)?)?,
        decode(-center.local)?,
    )
}
pub fn eligible(
    minimum: Axis,
    maximum: Axis,
    center: Axis,
    zoom: f64,
    extent: f64,
) -> Result<bool, Code> {
    let bits = zoom.to_bits();
    let mantissa = (bits & ((1_u64 << 52) - 1)) | (1_u64 << 52);
    let exponent = ((bits >> 52) & 2047) as i32 - 1023 - 52;
    // Maximum admitted radius plus the approved rounding allowance; 2 logical AA guard.
    let radius = 256.0 + 2_f64.powi(-38);
    let lower = signed_add(relative(minimum, center)?, decode(-radius)?)?;
    let upper = signed_add(relative(maximum, center)?, decode(radius)?)?;
    let half = signed_add(decode(extent / 2.0)?, decode(2.0)?)?
        .1
        .shift((-exponent) as usize)?;
    Ok(
        !larger((lower.0, lower.1.multiply(mantissa)?), (false, half))
            && !larger((true, half), (upper.0, upper.1.multiply(mantissa)?)),
    )
}
pub fn project(point: Axis, center: Axis, zoom: f64, extent: f64) -> Result<f64, Code> {
    let delta = i128::from(point.region) - i128::from(center.region);
    if delta.abs() > 5 {
        return Err(Code::NumericalCapacity);
    }
    let projected = (delta as f64 * 65536.0 + point.local - center.local) * zoom + extent / 2.0;
    if !projected.is_finite() || projected.abs() >= 2_f64.powi(21) {
        return Err(Code::NumericalCapacity);
    }
    Ok(projected)
}
