// Synthetic candidate only: local + (a-b)/zoom, exact supplied binary64 operands.
use crate::magnitude::{Magnitude, decode, signed_add};

fn round(numerator: Magnitude, denominator: Magnitude) -> f64 {
    if numerator.width() == 0 {
        return 0.0;
    }
    let mut exponent = numerator.width() as i32 - denominator.width() as i32;
    let comparison = if exponent >= 0 {
        numerator.compare(denominator.shift(exponent as usize))
    } else {
        numerator.shift((-exponent) as usize).compare(denominator)
    };
    if comparison.is_lt() {
        exponent -= 1;
    }
    let scale = (exponent - 52).max(-1074);
    let (mut significand, mut remainder) = numerator.divide(denominator);
    for _ in 0..-scale {
        remainder = remainder.shift(1);
        significand <<= 1;
        if remainder.compare(denominator).is_ge() {
            remainder = remainder.subtract(denominator);
            significand |= 1;
        }
    }
    let comparison = remainder.shift(1).compare(denominator);
    if comparison.is_gt() || (comparison.is_eq() && significand & 1 != 0) {
        significand += 1;
    }
    if scale == -1074 {
        f64::from_bits(significand)
    } else {
        f64::from_bits((((scale + 1075) as u64) << 52) + significand - (1_u64 << 52))
    }
}

pub fn normalize(
    region: i64,
    local: f64,
    a: f64,
    b: f64,
    zoom: f64,
    limit: u64,
) -> Result<(i64, f64), &'static str> {
    if !local.is_finite()
        || !(0.0..65536.0).contains(&local)
        || !a.is_finite()
        || !b.is_finite()
        || a.abs() > 16384.0
        || b.abs() > 16384.0
        || !zoom.is_finite()
        || !(0.1..=8.0).contains(&zoom)
    {
        return Err("InputBound");
    }
    let (sign_b, mag_b) = decode(b);
    let (negative, difference) = signed_add(decode(a), (!sign_b, mag_b));
    if difference
        .compare(Magnitude::small(limit).shift(1074))
        .is_gt()
    {
        return Err("InputBound");
    }
    let zoom_bits = zoom.to_bits();
    let mantissa = (zoom_bits & ((1_u64 << 52) - 1)) | (1_u64 << 52);
    let exponent = ((zoom_bits >> 52) & 2047) as i32 - 1023 - 52;
    let denominator = Magnitude::small(mantissa).shift(1074);
    let (negative, numerator) = signed_add(
        (false, decode(local).1.multiply(mantissa)),
        (negative, difference.shift((-exponent) as usize)),
    );
    let region_denominator = denominator.shift(16);
    let (whole, mut remainder) = numerator.divide(region_denominator);
    let mut delta = i128::from(whole);
    if negative {
        delta = -delta;
        if remainder.width() != 0 {
            delta -= 1;
            remainder = region_denominator.subtract(remainder);
        }
    }
    let mut region = i64::try_from(i128::from(region) + delta).map_err(|_| "CoordinateOverflow")?;
    let mut local = round(remainder, denominator);
    if local == 65536.0 {
        region = region.checked_add(1).ok_or("CoordinateOverflow")?;
        local = 0.0;
    }
    Ok((region, local))
}

pub fn observe(fields: &[&str]) {
    let region = fields[0].parse().expect("region");
    let values: Vec<f64> = fields[1..5]
        .iter()
        .map(|v| v.parse().expect("operand"))
        .collect();
    let limit = fields[5].parse().expect("limit");
    match normalize(region, values[0], values[1], values[2], values[3], limit) {
        Ok((region, local)) => println!("Q {region} {}", local.to_bits()),
        Err(reason) => println!("E {reason}"),
    }
}
