//! Approved even-odd and tapered capsule rules; query coordinates are view-local.
use super::picking::capsule_distance;
type Point = [f64; 2];
const EPSILON: f64 = 1e-7;
pub(super) struct Edge {
    a: Point,
    b: Point,
    bounds: [f64; 4],
    contact_margin: f64,
}
impl Edge {
    pub(super) fn new(a: Point, b: Point) -> Self {
        Self {
            a,
            b,
            // Conservative roundoff allowance for endpoint interpolation.
            // This only skips an impossible boundary-contact distance check;
            // the even-odd crossing rule still visits every edge.
            contact_margin: EPSILON
                + 16.0
                    * f64::EPSILON
                    * a[0]
                        .abs()
                        .max(a[1].abs())
                        .max(b[0].abs())
                        .max(b[1].abs())
                        .max(1.0),
            bounds: [
                a[0].min(b[0]),
                a[1].min(b[1]),
                a[0].max(b[0]),
                a[1].max(b[1]),
            ],
        }
    }
}
fn distance(p: Point, a: Point, b: Point) -> f64 {
    let dx = b[0] - a[0];
    let dy = b[1] - a[1];
    let length = dx * dx + dy * dy;
    let t = if length != 0.0 {
        (((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / length).clamp(0.0, 1.0)
    } else {
        0.0
    };
    (p[0] - a[0] - t * dx).hypot(p[1] - a[1] - t * dy)
}
fn crosses(a: Point, b: Point, c: Point, d: Point) -> bool {
    let cross = |p: Point, q: Point, r: Point| {
        (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
    };
    let (x, y, u, v) = (
        cross(a, b, c),
        cross(a, b, d),
        cross(c, d, a),
        cross(c, d, b),
    );
    ((x > 0.0 && y < 0.0) || (x < 0.0 && y > 0.0)) && ((u > 0.0 && v < 0.0) || (u < 0.0 && v > 0.0))
}
pub(super) fn contains(edges: &[Edge], p: Point) -> bool {
    if edges.len() < 3 {
        return false;
    }
    let mut inside = false;
    for edge in edges {
        let (a, b) = (edge.a, edge.b);
        let q = edge.bounds;
        let margin = edge.contact_margin;
        if p[0] >= q[0] - margin
            && p[0] <= q[2] + margin
            && p[1] >= q[1] - margin
            && p[1] <= q[3] + margin
            && distance(p, a, b) <= EPSILON
        {
            return true;
        }
        if (a[1] > p[1]) != (b[1] > p[1])
            && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]
        {
            inside = !inside;
        }
    }
    inside
}
fn touches(edge: &Edge, c: &[f64], epsilon: f64) -> bool {
    let (a, b, ar, br) = ([c[0], c[1]], [c[3], c[4]], c[2], c[5]);
    let r = ar.max(br);
    let q = edge.bounds;
    if a[0].max(b[0]) + r < q[0]
        || a[0].min(b[0]) - r > q[2]
        || a[1].max(b[1]) + r < q[1]
        || a[1].min(b[1]) - r > q[3]
    {
        return false;
    }
    distance(a, edge.a, edge.b) < ar + epsilon
        || distance(b, edge.a, edge.b) < br + epsilon
        || capsule_distance(edge.a[0], edge.a[1], c) < epsilon
        || capsule_distance(edge.b[0], edge.b[1], c) < epsilon
        || crosses(a, b, edge.a, edge.b)
}
pub(super) fn matches(edges: &[Edge], c: &[f64], partial: bool) -> bool {
    let a = [c[0], c[1]];
    let b = [c[3], c[4]];
    if partial {
        contains(edges, a)
            || contains(edges, b)
            || edges.iter().any(|edge| touches(edge, c, EPSILON))
    } else {
        contains(edges, a)
            && contains(edges, b)
            && !edges.iter().any(|edge| touches(edge, c, -EPSILON))
    }
}
