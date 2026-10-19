//! Synthetic transpose-rotation candidate; no application or ABI imports.
use crate::magnitude::{Magnitude, decode, signed_add};

// Coefficients are the proposed diagnostic table: zero or normal with exponent >= -54.
fn weighted(value: f64, coefficient: f64) -> (bool, Magnitude) {
    if coefficient == 0.0 {
        return (false, Magnitude::small(0));
    }
    let bits = coefficient.to_bits();
    let exponent = ((bits >> 52) & 2047) as i32 - 1023 - 52;
    assert!((-54..=-52).contains(&exponent));
    let mantissa = (bits & ((1_u64 << 52) - 1)) | (1_u64 << 52);
    let (negative, magnitude) = decode(value);
    (
        negative != (bits >> 63 != 0),
        magnitude.multiply(mantissa).shift((exponent + 54) as usize),
    )
}

fn multiply_wide(value: Magnitude, factor: u128) -> Magnitude {
    value
        .multiply(factor as u64)
        .add(value.multiply((factor >> 64) as u64).shift(64))
}

fn normalize(
    region: i64,
    local: f64,
    positions: [f64; 4],
    zoom: f64,
    coefficients: (f64, f64),
    inverse: bool,
    limit: u64,
) -> Result<(i64, f64), &'static str> {
    if !positions
        .iter()
        .chain([local, zoom].iter())
        .all(|v| v.is_finite())
        || !(0.0..65536.0).contains(&local)
        || positions.iter().any(|v| v.abs() > 16384.0)
        || !(0.1..=8.0).contains(&zoom)
    {
        return Err("InputBound");
    }
    for pair in positions.as_chunks::<2>().0 {
        let difference = signed_add(decode(pair[0]), decode(-pair[1])).1;
        if difference
            .compare(Magnitude::small(limit).shift(1074))
            .is_gt()
        {
            return Err("InputBound");
        }
    }
    let x = signed_add(
        weighted(positions[0], coefficients.0),
        weighted(-positions[1], coefficients.0),
    );
    let y = signed_add(
        weighted(positions[2], coefficients.1),
        weighted(-positions[3], coefficients.1),
    );
    let (sign, offset) = signed_add(x, y);
    let bits = zoom.to_bits();
    let mantissa = (bits & ((1_u64 << 52) - 1)) | (1_u64 << 52);
    let exponent = ((bits >> 52) & 2047) as i32 - 1023 - 52;
    let c = (coefficients.0.abs() * 2_f64.powi(54)) as u128;
    let s = (coefficients.1.abs() * 2_f64.powi(54)) as u128;
    let determinant = if inverse { c * c + s * s } else { 1 };
    let denominator = multiply_wide(Magnitude::small(mantissa).shift(1128), determinant);
    let (negative, numerator) = signed_add(
        (
            false,
            multiply_wide(decode(local).1.shift(54).multiply(mantissa), determinant),
        ),
        (
            sign,
            offset.shift((-exponent + if inverse { 108 } else { 0 }) as usize),
        ),
    );
    let regional = denominator.shift(16);
    let (whole, mut remainder) = numerator.divide(regional);
    let mut delta = i128::from(whole);
    if negative {
        delta = -delta;
        if remainder.width() != 0 {
            delta -= 1;
            remainder = regional.subtract(remainder);
        }
    }
    let mut region = i64::try_from(i128::from(region) + delta).map_err(|_| "CoordinateOverflow")?;
    let mut local = crate::viewport::round(remainder, denominator);
    if local == 65536.0 {
        region = region.checked_add(1).ok_or("CoordinateOverflow")?;
        local = 0.0;
    }
    Ok((region, local))
}

pub fn observe(fields: &[&str], inverse: bool) {
    let region = fields[0].parse().expect("region");
    let v: Vec<f64> = fields[1..9]
        .iter()
        .map(|s| s.parse().expect("number"))
        .collect();
    let limit = fields[9].parse().expect("limit");
    match normalize(
        region,
        v[0],
        [v[1], v[2], v[3], v[4]],
        v[5],
        (v[6], v[7]),
        inverse,
        limit,
    ) {
        Ok((region, local)) => println!("Q {region} {}", local.to_bits()),
        Err(reason) => println!("E {reason}"),
    }
}
