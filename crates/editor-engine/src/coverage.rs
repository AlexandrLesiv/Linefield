use crate::{
    Code, Engine, Metrics,
    numerics::{Axis, Viewport},
};
use linefield_editor_geometry::Bounds;
impl Engine {
    pub(crate) fn view_bounds(&self, anchor: [Axis; 2], padding: f64) -> Result<Bounds, Code> {
        let m = self
            .current
            .and_then(|s| s.metrics)
            .ok_or(Code::Unavailable)?;
        Self::coverage_bounds(self.document.view, m, anchor, padding)
    }
    pub(crate) fn coverage_bounds(
        v: Viewport,
        m: Metrics,
        anchor: [Axis; 2],
        padding: f64,
    ) -> Result<Bounds, Code> {
        // Culling only: bound the regional difference before floating conversion.
        // Source control hulls are formed from <=64-region local sample offsets;
        // the wider 256-region window safely includes their Hermite support and view.
        let relative = |a: Axis, b: Axis| {
            let d = i128::from(a.region) - i128::from(b.region);
            if d.abs() > 256 {
                Err(Code::CoordinateOverflow)
            } else {
                Ok(d as f64 * 65536.0 + a.local - b.local)
            }
        };
        let x = relative(v.center[0], anchor[0])?;
        let y = relative(v.center[1], anchor[1])?;
        let padding = padding + 0.000001;
        let (s, c) = v.angle.sin_cos();
        let dx = (c.abs() * m.width + s.abs() * m.height) * 0.5 / v.zoom + padding;
        let dy = (s.abs() * m.width + c.abs() * m.height) * 0.5 / v.zoom + padding;
        Ok([x - dx, y - dy, x + dx, y + dy])
    }
}
