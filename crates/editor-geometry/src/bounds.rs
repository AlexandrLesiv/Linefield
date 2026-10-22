use crate::{Curve, Point};
pub type Bounds = [f64; 4];
pub fn bounds(curve: &Curve) -> Bounds {
    let mut out = [
        f64::INFINITY,
        f64::INFINITY,
        f64::NEG_INFINITY,
        f64::NEG_INFINITY,
    ];
    for p in curve {
        out[0] = out[0].min(p[0] - p[2]);
        out[1] = out[1].min(p[1] - p[2]);
        out[2] = out[2].max(p[0] + p[2]);
        out[3] = out[3].max(p[1] + p[2]);
    }
    out
}
pub fn intersects(a: Bounds, b: Bounds) -> bool {
    a[0] <= b[2] && a[1] <= b[3] && a[2] >= b[0] && a[3] >= b[1]
}
pub fn edge_error(p: Point, a: Point, b: Point) -> f64 {
    let dx = b[0] - a[0];
    let dy = b[1] - a[1];
    let length = dx * dx + dy * dy;
    let t = if length > 0.0 {
        (((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / length).clamp(0.0, 1.0)
    } else {
        0.0
    };
    (p[0] - (a[0] + dx * t)).hypot(p[1] - (a[1] + dy * t))
        + (p[2] - (a[2] + (b[2] - a[2]) * t)).abs()
}
