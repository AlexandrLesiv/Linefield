//! Outward binary64 enclosure. Inputs denote exact finite binary64 values.
use crate::Code;
#[derive(Clone, Copy)]
pub(crate) struct Interval {
    low: f64,
    high: f64,
}
impl Interval {
    pub fn exact(value: f64) -> Result<Self, Code> {
        Self::bounds(value, value)
    }
    fn bounds(low: f64, high: f64) -> Result<Self, Code> {
        if !low.is_finite() || !high.is_finite() || low > high {
            return Err(Code::NumericalCapacity);
        }
        Ok(Self { low, high })
    }
    pub fn add(self, other: Self) -> Result<Self, Code> {
        Self::bounds(
            (self.low + other.low).next_down(),
            (self.high + other.high).next_up(),
        )
    }
    pub fn subtract(self, other: Self) -> Result<Self, Code> {
        Self::bounds(
            (self.low - other.high).next_down(),
            (self.high - other.low).next_up(),
        )
    }
    pub fn multiply(self, other: Self) -> Result<Self, Code> {
        let values = [
            self.low * other.low,
            self.low * other.high,
            self.high * other.low,
            self.high * other.high,
        ];
        if values.iter().any(|v| !v.is_finite()) {
            return Err(Code::NumericalCapacity);
        }
        Self::bounds(
            values.into_iter().fold(f64::INFINITY, f64::min).next_down(),
            values
                .into_iter()
                .fold(f64::NEG_INFINITY, f64::max)
                .next_up(),
        )
    }
    pub fn max_abs(self) -> f64 {
        self.low.abs().max(self.high.abs())
    }
}
pub(crate) fn relative(a: super::Axis, b: super::Axis) -> Result<Interval, Code> {
    let delta = i128::from(a.region) - i128::from(b.region);
    if delta.abs() > 64 {
        return Err(Code::NumericalCapacity);
    }
    Interval::exact(delta as f64 * 65536.0)?
        .add(Interval::exact(a.local)?)?
        .subtract(Interval::exact(b.local)?)
}
