mod magnitude;
mod normalize;
#[cfg(feature = "e2e-fixtures")]
pub mod raster_offset;
mod round;
use crate::Code;
pub use normalize::normalize;
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct Axis {
    pub region: i64,
    pub local: f64,
}
impl Axis {
    pub fn relative(self, other: Self) -> Result<f64, Code> {
        let delta = i128::from(self.region) - i128::from(other.region);
        if delta.abs() > 64 {
            return Err(Code::NumericalCapacity);
        }
        Ok(delta as f64 * 65536.0 + self.local - other.local)
    }
}
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Viewport {
    pub center: [Axis; 2],
    pub zoom: f64,
    pub angle: f64,
}
impl Default for Viewport {
    fn default() -> Self {
        Self {
            center: [Axis::default(); 2],
            zoom: 1.0,
            angle: 0.0,
        }
    }
}
impl Viewport {
    pub fn inverse(self, a: [f64; 2], b: [f64; 2]) -> Result<[Axis; 2], Code> {
        if a.iter()
            .chain(b.iter())
            .any(|v| !v.is_finite() || v.abs() > 16384.0)
        {
            return Err(Code::Invalid);
        }
        let dx = a[0] - b[0];
        let dy = a[1] - b[1];
        if dx.abs() > 8192.0 || dy.abs() > 8192.0 {
            return Err(Code::Invalid);
        }
        if self.angle == 0.0 {
            return Ok([
                normalize(self.center[0], a[0], b[0], self.zoom, 8192)?,
                normalize(self.center[1], a[1], b[1], self.zoom, 8192)?,
            ]);
        }
        let (s, c) = self.angle.sin_cos();
        let det = c * c + s * s;
        Ok([
            normalize(
                self.center[0],
                (c * dx + s * dy) / det,
                0.0,
                self.zoom,
                16384,
            )?,
            normalize(
                self.center[1],
                (-s * dx + c * dy) / det,
                0.0,
                self.zoom,
                16384,
            )?,
        ])
    }
}
