//! Fixture-only exact accepted CSS displacement proof; no render-phase authority.
use super::magnitude::{Magnitude, decode, signed_add};

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum Outcome {
    #[default]
    Integral,
    Fractional,
    Range,
    Uncertified,
}
impl Outcome {
    pub fn label(self) -> &'static str {
        match self {
            Self::Integral => "integral",
            Self::Fractional => "fractional",
            Self::Range => "range",
            Self::Uncertified => "uncertified",
        }
    }
}
pub fn offset(start: f64, current: f64, backing: f64, saved: i32) -> Result<i32, Outcome> {
    if !start.is_finite()
        || !current.is_finite()
        || start.abs() > 16384.0
        || current.abs() > 16384.0
        || !(1.0..=4.0).contains(&backing)
        || saved.unsigned_abs() > 16384
    {
        return Err(Outcome::Uncertified);
    }
    let exact = || {
        let (negative, magnitude) = decode(start)?;
        let (negative, difference) = signed_add(decode(current)?, (!negative, magnitude))?;
        let bits = backing.to_bits();
        let mantissa = (bits & ((1_u64 << 52) - 1)) | (1_u64 << 52);
        let exponent = ((bits >> 52) & 2047) as i32 - 1023 - 52;
        let numerator = difference.multiply(mantissa)?;
        let denominator = Magnitude::small(1).shift((1074 - exponent) as usize)?;
        let (negative, numerator) = signed_add(
            (negative, numerator),
            (
                saved < 0,
                denominator.multiply(u64::from(saved.unsigned_abs()))?,
            ),
        )?;
        let (whole, remainder) = numerator.divide(denominator)?;
        Ok::<_, crate::Code>((negative, whole, remainder.width() == 0))
    };
    let (negative, whole, integral) = exact().map_err(|_| Outcome::Uncertified)?;
    if whole > 16384 || (whole == 16384 && !integral) {
        return Err(Outcome::Range);
    }
    if !integral {
        return Err(Outcome::Fractional);
    }
    let signed = if negative {
        -i128::from(whole)
    } else {
        i128::from(whole)
    };
    let value = signed;
    if !(-16384..=16384).contains(&value) {
        return Err(Outcome::Range);
    }
    Ok(value as i32)
}
