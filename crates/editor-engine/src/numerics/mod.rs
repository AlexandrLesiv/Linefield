mod inverse;
mod magnitude;
mod normalize;
mod projection;
mod rotation;
mod round;
pub use inverse::unproject;
pub use projection::{eligible, project};
pub use rotation::coefficients;
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct Axis {
    pub region: i64,
    pub local: f64,
}
impl Axis {
    pub fn min(self, other: Self) -> Self {
        if self.region < other.region || (self.region == other.region && self.local < other.local) {
            self
        } else {
            other
        }
    }
    pub fn max(self, other: Self) -> Self {
        if self.min(other) == self { other } else { self }
    }
}
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Viewport {
    pub x: Axis,
    pub y: Axis,
    pub zoom: f64,
    pub rotation: u8,
}
impl Default for Viewport {
    fn default() -> Self {
        Self {
            x: Axis::default(),
            y: Axis::default(),
            zoom: 1.0,
            rotation: 0,
        }
    }
}
