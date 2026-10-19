//! Exact inverse-view AABB classification precedes bounded floating projection.
use super::magnitude::{Magnitude, Signed, decode, larger, signed_add};
use super::rotation::{determinant, weighted};
use super::{Axis, Viewport, coefficients};
use crate::{Code, Metrics};
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
fn eligible_axis(
    minimum: Axis,
    maximum: Axis,
    center: Axis,
    view: Viewport,
    extent: [f64; 2],
    pair: [f64; 2],
) -> Result<bool, Code> {
    let bits = view.zoom.to_bits();
    let mantissa = (bits & ((1_u64 << 52) - 1)) | (1_u64 << 52);
    let exponent = ((bits >> 52) & 2047) as i32 - 1023 - 52;
    let radius = 256.0 + 2_f64.powi(-38);
    let lower = signed_add(relative(minimum, center)?, decode(-radius)?)?;
    let upper = signed_add(relative(maximum, center)?, decode(radius)?)?;
    let half = signed_add(
        weighted(
            signed_add(decode(extent[0] / 2.0)?, decode(2.0)?)?,
            pair[0].abs(),
        )?,
        weighted(
            signed_add(decode(extent[1] / 2.0)?, decode(2.0)?)?,
            pair[1].abs(),
        )?,
    )?
    .1
    .shift((54 - exponent) as usize)?;
    let determinant = determinant(pair);
    let scaled = |v: Signed| -> Result<Signed, Code> {
        Ok((v.0, v.1.multiply(mantissa)?.multiply_wide(determinant)?))
    };
    Ok(!larger(scaled(lower)?, (false, half)) && !larger((true, half), scaled(upper)?))
}
pub fn eligible(
    minimum: [Axis; 2],
    maximum: [Axis; 2],
    view: Viewport,
    metrics: Metrics,
) -> Result<bool, Code> {
    let [c, s] = coefficients(view.rotation);
    let extent = [metrics.width, metrics.height];
    Ok(
        eligible_axis(minimum[0], maximum[0], view.x, view, extent, [c, s])?
            && eligible_axis(minimum[1], maximum[1], view.y, view, extent, [s, c])?,
    )
}
pub fn project(point: [Axis; 2], view: Viewport, metrics: Metrics) -> Result<[f64; 2], Code> {
    let delta = |point: Axis, center: Axis| -> Result<f64, Code> {
        let regions = i128::from(point.region) - i128::from(center.region);
        if regions.abs() > 5 {
            return Err(Code::NumericalCapacity);
        }
        Ok(regions as f64 * 65536.0 + point.local - center.local)
    };
    let x = delta(point[0], view.x)?;
    let y = delta(point[1], view.y)?;
    let [c, s] = coefficients(view.rotation);
    let result = [
        (c * x - s * y) * view.zoom + metrics.width / 2.0,
        (s * x + c * y) * view.zoom + metrics.height / 2.0,
    ];
    if result
        .iter()
        .any(|v| !v.is_finite() || v.abs() >= 2_f64.powi(22))
    {
        return Err(Code::NumericalCapacity);
    }
    Ok(result)
}
