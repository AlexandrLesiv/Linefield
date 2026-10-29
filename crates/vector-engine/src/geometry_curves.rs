// Disposable, bounded render geometry. Canonical samples are never rewritten.
//
// Each chunk owns the spans whose destination raw sample lies in its 128-sample
// block. A span consults one sample on either side for its Hermite tangents, so
// appending a point changes only the previous tail span and the new span.
use crate::Stroke;

pub(crate) const CHUNK_POINTS: usize = 128;
const MAX_DEPTH: u32 = 5;
pub(crate) const MAX_CHUNK_SEGMENTS: usize = CHUNK_POINTS * (1 << MAX_DEPTH);
const CORNER_COSINE: Real = 0.35;
type Position = [Real; 3];
pub(crate) type Cubic = [Position; 4];

#[derive(Clone, Copy)]
struct Vertex {
    point: Position,
    keep: bool,
}

/// Scratch memory is reused and has a fixed upper bound independent of stroke size.
#[derive(Default)]
pub(crate) struct Scratch {
    vertices: Vec<Vertex>,
    stack: Vec<(usize, usize)>,
    pub(crate) output: Vec<Real>,
}

fn delta(a: Position, b: Position) -> [Real; 2] {
    [b[0] - a[0], b[1] - a[1]]
}
fn length(v: [Real; 2]) -> Real {
    v[0].hypot(v[1])
}
fn stationary(a: Position, b: Position) -> bool {
    a[0] == b[0] && a[1] == b[1]
}
fn neighbors(stroke: &Stroke, index: usize) -> Option<([Real; 2], [Real; 2], Real, Real)> {
    if index == 0 || index + 1 >= stroke.points.len() {
        return None;
    }
    let point = source_point(stroke, index);
    let before = delta(source_point(stroke, index - 1), point);
    let after = delta(point, source_point(stroke, index + 1));
    Some((before, after, length(before), length(after)))
}
fn is_corner(stroke: &Stroke, index: usize) -> bool {
    neighbors(stroke, index).is_some_and(|(a, b, la, lb)| {
        la == 0.0
            || lb == 0.0
            || (a[0] / la) * (b[0] / lb) + (a[1] / la) * (b[1] / lb) < CORNER_COSINE
    })
}
fn pressure_extremum(stroke: &Stroke, index: usize) -> bool {
    if index == 0 || index + 1 >= stroke.points.len() {
        return false;
    }
    let p = stroke.points[index].pressure;
    let a = stroke.points[index - 1].pressure;
    let b = stroke.points[index + 1].pressure;
    (p > a && p > b) || (p < a && p < b)
}
fn tangent(stroke: &Stroke, index: usize, chord: [Real; 2]) -> [Real; 2] {
    let Some((before, after, la, lb)) = neighbors(stroke, index) else {
        return chord;
    };
    if la == 0.0 || lb == 0.0 {
        return chord;
    }
    let dot = (before[0] / la) * (after[0] / lb) + (before[1] / la) * (after[1] / lb);
    if dot < CORNER_COSINE {
        // One-sided tangents preserve an intentional sharp corner exactly.
        return chord;
    }
    let bisector = [
        before[0] / la + after[0] / lb,
        before[1] / la + after[1] / lb,
    ];
    let scale = la.min(lb) / length(bisector);
    [bisector[0] * scale, bisector[1] * scale]
}
pub(crate) fn source_span(stroke: &Stroke, destination: usize) -> Cubic {
    let a = source_point(stroke, destination.saturating_sub(1));
    let b = source_point(stroke, destination);
    let chord = delta(a, b);
    let ta = tangent(stroke, destination.saturating_sub(1), chord);
    let tb = tangent(stroke, destination, chord);
    // Interpolate the endpoint radii after applying the stroke's pressure curve.
    // Radius cannot overshoot, even when its centerline is curved.
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
pub(crate) fn evaluate(c: Cubic, t: f64) -> Position {
    let t = t as Real;
    let mix = |a: Position, b: Position| std::array::from_fn(|i| a[i] * (1.0 - t) + b[i] * t);
    let a = mix(c[0], c[1]);
    let b = mix(c[1], c[2]);
    let d = mix(c[2], c[3]);
    mix(mix(a, b), mix(b, d))
}
fn split(c: Cubic, t: f64) -> (Cubic, Cubic) {
    let t = t as Real;
    let mix = |a: Position, b: Position| std::array::from_fn(|i| a[i] * (1.0 - t) + b[i] * t);
    let a = mix(c[0], c[1]);
    let b = mix(c[1], c[2]);
    let d = mix(c[2], c[3]);
    let e = mix(a, b);
    let f = mix(b, d);
    let m = mix(e, f);
    ([c[0], a, e, m], [m, f, d, c[3]])
}
pub(crate) fn span(stroke: &Stroke, destination: usize) -> Cubic {
    if stroke.slice.is_none() {
        return source_span(stroke, destination);
    }
    if destination == 0 {
        return [render_point(stroke, 0); 4];
    }
    let a = stroke.parameter(destination - 1);
    let b = stroke.parameter(destination);
    let base = a.floor();
    let c = source_span(stroke, base as usize + 1);
    let lo = a - base;
    let hi = b - base;
    let original = c;
    let c = if hi < 1.0 { split(c, hi).0 } else { c };
    let mut c = if lo > 0.0 { split(c, lo / hi).1 } else { c };
    // Evaluate both copies of each cut boundary from the same source parameter.
    c[0] = if lo == 0.0 {
        original[0]
    } else {
        evaluate(original, lo)
    };
    c[3] = if hi == 1.0 {
        original[3]
    } else {
        evaluate(original, hi)
    };
    c
}
