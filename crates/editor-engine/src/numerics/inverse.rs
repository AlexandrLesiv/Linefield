//! Exact determinant-corrected inverse, then one nearest-even regional normalization.
use super::magnitude::{Magnitude, decode, signed_add};
use super::rotation::{determinant, weighted};
use super::{Axis, Viewport, coefficients};
use crate::Code;
fn axis(
    center: Axis,
    positions: [f64; 4],
    zoom: f64,
    pair: [f64; 2],
    limit: u64,
) -> Result<Axis, Code> {
    if !center.local.is_finite()
        || !(0.0..65536.0).contains(&center.local)
        || positions
            .iter()
            .any(|v| !v.is_finite() || v.abs() > 16384.0)
        || !zoom.is_finite()
        || !(0.1..=8.0).contains(&zoom)
    {
        return Err(Code::Invalid);
    }
    let x = signed_add(decode(positions[0])?, decode(-positions[1])?)?;
    let y = signed_add(decode(positions[2])?, decode(-positions[3])?)?;
    let bound = Magnitude::small(limit).shift(1074)?;
    if x.1.compare(bound).is_gt() || y.1.compare(bound).is_gt() {
        return Err(Code::Invalid);
    }
    let (sign, offset) = signed_add(weighted(x, pair[0])?, weighted(y, pair[1])?)?;
    let bits = zoom.to_bits();
    let mantissa = (bits & ((1_u64 << 52) - 1)) | (1_u64 << 52);
    let exponent = ((bits >> 52) & 2047) as i32 - 1023 - 52;
    let determinant = determinant(pair);
    let denominator = Magnitude::small(mantissa)
        .shift(1128)?
        .multiply_wide(determinant)?;
    let (negative, numerator) = signed_add(
        (
            false,
            decode(center.local)?
                .1
                .shift(54)?
                .multiply(mantissa)?
                .multiply_wide(determinant)?,
        ),
        (sign, offset.shift((108 - exponent) as usize)?),
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
    let mut local = super::round::round(remainder, denominator)?;
    if local == 65536.0 {
        region = region.checked_add(1).ok_or(Code::CoordinateOverflow)?;
        local = 0.0;
    }
    Ok(Axis { region, local })
}
pub fn unproject(view: Viewport, a: [f64; 2], b: [f64; 2], limit: u64) -> Result<[Axis; 2], Code> {
    if view.rotation.is_multiple_of(6) {
        let (x, y) = match view.rotation {
            0 => ([a[0], b[0]], [a[1], b[1]]),
            6 => ([a[1], b[1]], [b[0], a[0]]),
            12 => ([b[0], a[0]], [b[1], a[1]]),
            _ => ([b[1], a[1]], [a[0], b[0]]),
        };
        return Ok([
            super::normalize::normalize(view.x, x[0], x[1], view.zoom, limit)?,
            super::normalize::normalize(view.y, y[0], y[1], view.zoom, limit)?,
        ]);
    }
    let [c, s] = coefficients(view.rotation);
    let positions = [a[0], b[0], a[1], b[1]];
    Ok([
        axis(view.x, positions, view.zoom, [c, s], limit)?,
        axis(view.y, positions, view.zoom, [-s, c], limit)?,
    ])
}
