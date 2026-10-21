pub type Point = [f64; 3];
pub type Curve = [Point; 4];
fn tangent(a: Point, b: Point, c: Point, chord: [f64; 2]) -> [f64; 2] {
    let u = [b[0] - a[0], b[1] - a[1]];
    let v = [c[0] - b[0], c[1] - b[1]];
    let la = u[0].hypot(u[1]);
    let lb = v[0].hypot(v[1]);
    if la == 0.0 || lb == 0.0 {
        return chord;
    }
    if (u[0] / la) * (v[0] / lb) + (u[1] / la) * (v[1] / lb) < 0.35 {
        return chord;
    }
    let sum = [u[0] / la + v[0] / lb, u[1] / la + v[1] / lb];
    let scale = la.min(lb) / sum[0].hypot(sum[1]);
    [sum[0] * scale, sum[1] * scale]
}
/// Version 1: bounded bisector tangents, sharp corners, linear endpoint radii.
pub fn span(before: Option<Point>, a: Point, b: Point, after: Option<Point>) -> Curve {
    let chord = [b[0] - a[0], b[1] - a[1]];
    let ta = before.map_or(chord, |p| tangent(p, a, b, chord));
    let tb = after.map_or(chord, |p| tangent(a, b, p, chord));
    [
        a,
        [
            a[0] + ta[0] / 3.0,
            a[1] + ta[1] / 3.0,
            a[2] + (b[2] - a[2]) / 3.0,
        ],
        [
            b[0] - tb[0] / 3.0,
            b[1] - tb[1] / 3.0,
            b[2] - (b[2] - a[2]) / 3.0,
        ],
        b,
    ]
}
