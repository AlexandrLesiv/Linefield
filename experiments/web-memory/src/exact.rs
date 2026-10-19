// Isolated fixed-size dyadic candidate. No production integration or adoption.
const WORDS: usize = 19;
type Magnitude = [u64; WORDS];

fn shifted(value: u64, offset: usize) -> Magnitude {
    let mut out = [0; WORDS];
    out[offset / 64] = value << (offset % 64);
    if !offset.is_multiple_of(64) && offset / 64 + 1 < WORDS {
        out[offset / 64 + 1] = value >> (64 - offset % 64);
    }
    out
}

fn compare(a: &Magnitude, b: &Magnitude) -> std::cmp::Ordering {
    a.iter().rev().cmp(b.iter().rev())
}

fn add(a: Magnitude, b: Magnitude) -> Magnitude {
    let mut out = [0; WORDS];
    let mut carry = 0_u128;
    for i in 0..WORDS {
        let value = a[i] as u128 + b[i] as u128 + carry;
        out[i] = value as u64;
        carry = value >> 64;
    }
    assert_eq!(carry, 0);
    out
}

fn subtract(a: Magnitude, b: Magnitude) -> Magnitude {
    let mut out = [0; WORDS];
    let mut borrow = false;
    for i in 0..WORDS {
        let (v, b1) = a[i].overflowing_sub(b[i]);
        let (v, b2) = v.overflowing_sub(u64::from(borrow));
        out[i] = v;
        borrow = b1 || b2;
    }
    assert!(!borrow);
    out
}

fn signed_add(a: (bool, Magnitude), b: (bool, Magnitude)) -> (bool, Magnitude) {
    if a.0 == b.0 {
        (a.0, add(a.1, b.1))
    } else if compare(&a.1, &b.1).is_ge() {
        (a.0, subtract(a.1, b.1))
    } else {
        (b.0, subtract(b.1, a.1))
    }
}

fn decode(value: f64) -> (bool, Magnitude) {
    let bits = value.to_bits();
    let exponent = ((bits >> 52) & 2047) as usize;
    let fraction = bits & ((1_u64 << 52) - 1);
    let mantissa = if exponent == 0 {
        fraction
    } else {
        fraction | (1_u64 << 52)
    };
    (
        bits >> 63 != 0,
        shifted(mantissa, exponent.saturating_sub(1)),
    )
}

fn bit(value: &Magnitude, position: usize) -> bool {
    value[position / 64] & (1_u64 << (position % 64)) != 0
}

fn low_nonzero(value: &Magnitude, end: usize) -> bool {
    (0..end).any(|position| bit(value, position))
}

fn round(value: &Magnitude) -> f64 {
    let Some(top) = (0..1091).rev().find(|&position| bit(value, position)) else {
        return 0.0;
    };
    let shift = top.saturating_sub(52);
    let mut significand = 0_u64;
    for position in (shift..=top).rev() {
        significand = (significand << 1) | u64::from(bit(value, position));
    }
    if shift > 0 && bit(value, shift - 1) && (low_nonzero(value, shift - 1) || significand & 1 != 0)
    {
        significand += 1;
    }
    if shift == 0 {
        f64::from_bits(significand)
    } else {
        f64::from_bits((((shift + 1) as u64) << 52) + significand - (1_u64 << 52))
    }
}

pub fn normalize(region: i64, a: f64, b: f64) -> Result<(i64, f64), &'static str> {
    if !a.is_finite() || !b.is_finite() || a.abs() > 65536.0 || b.abs() > 65536.0 {
        return Err("InputBound");
    }
    let start = (region < 0, shifted(region.unsigned_abs(), 1090));
    let (negative, magnitude) = signed_add(signed_add(start, decode(a)), decode(b));
    let mut quotient = 0_i128;
    for position in (1090..WORDS * 64).rev() {
        quotient = (quotient << 1) | i128::from(bit(&magnitude, position));
    }
    let mut remainder = magnitude;
    for position in 1090..WORDS * 64 {
        remainder[position / 64] &= !(1_u64 << (position % 64));
    }
    if negative {
        quotient = -quotient;
        if low_nonzero(&remainder, 1090) {
            quotient -= 1;
            remainder = subtract(shifted(1, 1090), remainder);
        }
    }
    let mut q = i64::try_from(quotient).map_err(|_| "CoordinateOverflow")?;
    let mut local = round(&remainder);
    if local == 65536.0 {
        q = q.checked_add(1).ok_or("CoordinateOverflow")?;
        local = 0.0;
    }
    Ok((q, local))
}
