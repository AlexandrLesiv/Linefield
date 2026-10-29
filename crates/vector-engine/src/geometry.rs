//! Disposable, bounded render geometry. Canonical samples are never rewritten.
//!
//! Each chunk owns the spans whose destination raw sample lies in its 128-sample
//! block. A span consults one sample on either side for its Hermite tangents, so
//! appending a point changes only the previous tail span and the new span.
use crate::Stroke;

pub(crate) const CHUNK_POINTS: usize = 128;
const MAX_DEPTH: u32 = 5;
pub(crate) const MAX_CHUNK_SEGMENTS: usize = CHUNK_POINTS * (1 << MAX_DEPTH);
const CORNER_COSINE: f32 = 0.35;
type Position = [f32; 3];
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
    pub(crate) output: Vec<f32>,
}

fn delta(a: Position, b: Position) -> [f32; 2] {
    [b[0] - a[0], b[1] - a[1]]
}
fn length(v: [f32; 2]) -> f32 {
    v[0].hypot(v[1])
}
fn stationary(a: Position, b: Position) -> bool {
    a[0] == b[0] && a[1] == b[1]
}
fn neighbors(stroke: &Stroke, index: usize) -> Option<([f32; 2], [f32; 2], f32, f32)> {
    if index == 0 || index + 1 >= stroke.points.len() {
        return None;
    }
    let point = stroke.source_point(index);
    let before = delta(stroke.source_point(index - 1), point);
    let after = delta(point, stroke.source_point(index + 1));
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
fn tangent(stroke: &Stroke, index: usize, chord: [f32; 2]) -> [f32; 2] {
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
    let a = stroke.source_point(destination.saturating_sub(1));
    let b = stroke.source_point(destination);
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
    let t = t as f32;
    let mix = |a: Position, b: Position| std::array::from_fn(|i| a[i] * (1.0 - t) + b[i] * t);
    let a = mix(c[0], c[1]);
    let b = mix(c[1], c[2]);
    let d = mix(c[2], c[3]);
    mix(mix(a, b), mix(b, d))
}
fn split(c: Cubic, t: f64) -> (Cubic, Cubic) {
    let t = t as f32;
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
        return [stroke.render_point(0); 4];
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
fn midpoint(a: Position, b: Position) -> Position {
    // This form avoids overflow for two large, same-sign coordinates.
    [
        a[0] * 0.5 + b[0] * 0.5,
        a[1] * 0.5 + b[1] * 0.5,
        a[2] * 0.5 + b[2] * 0.5,
    ]
}
fn deviation(point: Position, a: Position, b: Position) -> f32 {
    let d = delta(a, b);
    let length_squared = d[0] * d[0] + d[1] * d[1];
    let t = if length_squared > 0.0 {
        (((point[0] - a[0]) * d[0] + (point[1] - a[1]) * d[1]) / length_squared).clamp(0.0, 1.0)
    } else {
        0.0
    };
    let center_error = (point[0] - (a[0] + d[0] * t)).hypot(point[1] - (a[1] + d[1] * t));
    center_error + (point[2] - (a[2] + (b[2] - a[2]) * t)).abs()
}
fn flatten(curve: Cubic, tolerance: f32, depth: u32, vertices: &mut Vec<Vertex>) {
    if depth == MAX_DEPTH
        || deviation(curve[1], curve[0], curve[3]).max(deviation(curve[2], curve[0], curve[3]))
            <= tolerance
    {
        vertices.push(Vertex {
            point: curve[3],
            keep: false,
        });
        return;
    }
    let ab = midpoint(curve[0], curve[1]);
    let bc = midpoint(curve[1], curve[2]);
    let cd = midpoint(curve[2], curve[3]);
    let abc = midpoint(ab, bc);
    let bcd = midpoint(bc, cd);
    let middle = midpoint(abc, bcd);
    flatten([curve[0], ab, abc, middle], tolerance, depth + 1, vertices);
    flatten([middle, bcd, cd, curve[3]], tolerance, depth + 1, vertices);
}
pub(crate) fn chunk_range(stroke: &Stroke, chunk: usize) -> Option<std::ops::Range<usize>> {
    let start = chunk.checked_mul(CHUNK_POINTS)?;
    (start < stroke.sample_count()).then(|| {
        start
            ..start
                .saturating_add(CHUNK_POINTS)
                .min(stroke.sample_count())
    })
}

impl Scratch {
    pub(crate) fn render(&mut self, stroke: &Stroke, chunk: usize, tolerance: f32) -> usize {
        let Some(range) = chunk_range(stroke, chunk) else {
            self.output.clear();
            return 0;
        };
        if stroke.slice.is_some() {
            let curves: Vec<_> = range.clone().map(|i| span(stroke, i)).collect();
            return self.render_curves(&curves, range.start == 0, tolerance);
        }
        self.render_range(stroke, range, tolerance)
    }
    pub(crate) fn render_curves(&mut self, curves: &[Cubic], dab: bool, tolerance: f32) -> usize {
        self.output.clear();
        let tolerance = if tolerance.is_finite() && tolerance > 0.0 {
            tolerance.max(0.0001)
        } else {
            0.25
        };
        if let Some(first) = curves.first() {
            if dab {
                self.output.extend_from_slice(&first[0]);
                self.output.extend_from_slice(&first[0]);
            }
            for (index, &curve) in curves.iter().enumerate() {
                if dab && index == 0 {
                    continue;
                }
                self.vertices.clear();
                flatten(curve, tolerance * 0.5, 0, &mut self.vertices);
                let mut previous = curve[0];
                for v in &self.vertices {
                    self.output.extend_from_slice(&previous);
                    self.output.extend_from_slice(&v.point);
                    previous = v.point;
                }
            }
        }
        self.output.len() / 6
    }
    pub(crate) fn render_range(
        &mut self,
        stroke: &Stroke,
        range: std::ops::Range<usize>,
        tolerance: f32,
    ) -> usize {
        self.vertices.clear();
        self.stack.clear();
        self.output.clear();
        let tolerance = if tolerance.is_finite() && tolerance > 0.0 {
            tolerance.max(0.0001)
        } else {
            0.25
        };
        let first = stroke.source_point(range.start.saturating_sub(1));
        self.vertices.push(Vertex {
            point: first,
            keep: true,
        });
        for index in range.clone() {
            if index == 0 {
                continue;
            }
            let curve = span(stroke, index);
            if stationary(curve[0], curve[3]) {
                // A pressure dab must survive even at extremely coarse LOD.
                self.vertices.last_mut().unwrap().keep = true;
                self.vertices.push(Vertex {
                    point: curve[3],
                    keep: true,
                });
            } else {
                flatten(curve, tolerance * 0.5, 0, &mut self.vertices);
                self.vertices.last_mut().unwrap().keep =
                    is_corner(stroke, index) || pressure_extremum(stroke, index);
            }
        }
        self.vertices.last_mut().unwrap().keep = true;
        // Simplify only between protected anchors. The sum of centerline and
        // radius error bounds the displaced stroke edge, not just its center.
        let mut anchor = 0;
        for end in 1..self.vertices.len() {
            if self.vertices[end].keep {
                self.stack.push((anchor, end));
                anchor = end;
            }
        }
        while let Some((start, end)) = self.stack.pop() {
            let a = self.vertices[start].point;
            let b = self.vertices[end].point;
            let mut maximum = tolerance * 0.5;
            let mut split = None;
            for index in start + 1..end {
                let error = deviation(self.vertices[index].point, a, b);
                if error > maximum {
                    maximum = error;
                    split = Some(index);
                }
            }
            if let Some(index) = split {
                self.vertices[index].keep = true;
                self.stack.push((start, index));
                self.stack.push((index, end));
            }
        }
        if range.start == 0 {
            self.output.extend_from_slice(&first);
            self.output.extend_from_slice(&first);
        }
        let mut previous = first;
        for vertex in self.vertices.iter().skip(1).filter(|v| v.keep) {
            self.output.extend_from_slice(&previous);
            self.output.extend_from_slice(&vertex.point);
            previous = vertex.point;
        }
        debug_assert!(self.output.len() / 6 <= MAX_CHUNK_SEGMENTS);
        self.output.len() / 6
    }
}

/// Conservative bounds include the cubic control hull expanded by the largest
/// endpoint radius. Simplification chords remain inside this same convex hull.
pub(crate) fn chunk_bounds(stroke: &Stroke, chunk: usize) -> Option<[f32; 4]> {
    let range = chunk_range(stroke, chunk)?;
    let mut bounds = [
        f32::INFINITY,
        f32::INFINITY,
        f32::NEG_INFINITY,
        f32::NEG_INFINITY,
    ];
    for index in range {
        let curve = span(stroke, index);
        let radius = curve[0][2].max(curve[3][2]);
        for point in curve {
            bounds[0] = bounds[0].min(point[0] - radius);
            bounds[1] = bounds[1].min(point[1] - radius);
            bounds[2] = bounds[2].max(point[0] + radius);
            bounds[3] = bounds[3].max(point[1] + radius);
        }
    }
    Some(bounds)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{Point, Points};

    fn stroke(samples: &[[f32; 3]]) -> Stroke {
        let mut points = Points::default();
        for &[x, y, pressure] in samples {
            points.push(Point::from_precise(f64::from(x), f64::from(y), pressure).unwrap());
        }
        Stroke {
            layer: 0,
            source_anchor: [crate::regional::Address::normalized(0, 0.0).unwrap(); 2],
            offset: [0.0; 2],
            basis: [1.0, 0.0],
            points: std::rc::Rc::new(points),
            slice: None,
            source: 0,
            blend_group: 0,
            width: 10.0,
            pressure_curve: crate::PressureCurve::default(),
            color: 0,
            opacity: 1.0,
            brush: 0,
            visible: true,
        }
    }
    fn wave(count: usize) -> Stroke {
        stroke(
            &(0..count)
                .map(|i| [i as f32 * 0.6, (i as f32 * 0.055).sin() * 12.0, 0.5])
                .collect::<Vec<_>>(),
        )
    }
    fn endpoint_present(output: &[f32], point: Position) -> bool {
        output
            .as_chunks::<6>()
            .0
            .iter()
            .any(|segment| segment[3..] == point)
    }
    #[test]
    fn chunks_share_exact_endpoints_and_canonical_samples_survive() {
        let stroke = wave(300);
        let before: Vec<_> = (0..stroke.points.len())
            .map(|i| {
                let p = stroke.points[i];
                p.canonical_bits()
            })
            .collect();
        let mut scratch = Scratch::default();
        for tolerance in [0.01, 0.25, 4.0] {
            scratch.render(&stroke, 0, tolerance);
            let last = scratch.output[scratch.output.len() - 3..].to_vec();
            assert_eq!(last, stroke.source_point(127));
            scratch.render(&stroke, 1, tolerance);
            assert_eq!(&scratch.output[..3], last);
            assert_eq!(
                &scratch.output[scratch.output.len() - 3..],
                stroke.source_point(255)
            );
            scratch.render(&stroke, 2, tolerance);
            assert_eq!(&scratch.output[..3], stroke.source_point(255));
        }
        for (i, bits) in before.iter().enumerate() {
            let p = stroke.points[i];
            assert_eq!(p.canonical_bits(), *bits);
        }
    }
    #[test]
    fn corners_stationary_dabs_and_pressure_extrema_survive_coarse_detail() {
        let stroke = stroke(&[
            [0.0, 0.0, 0.2],
            [10.0, 0.0, 0.2],
            [10.0, 10.0, 0.2],
            [10.0, 10.0, 0.9],
            [10.0, 10.0, 0.1],
            [20.0, 10.0, 0.8],
            [30.0, 10.0, 0.2],
        ]);
        let mut scratch = Scratch::default();
        scratch.render(&stroke, 0, 100.0);
        for index in 0..stroke.points.len() {
            assert!(
                endpoint_present(&scratch.output, stroke.source_point(index)),
                "missing anchor {index}"
            );
        }
        let stationary_spans = scratch
            .output
            .as_chunks::<6>()
            .0
            .iter()
            .filter(|s| s[0] == s[3] && s[1] == s[4])
            .count();
        assert_eq!(stationary_spans, 3); // initial dab and two pressure changes
    }
    #[test]
    fn curved_spans_are_smooth_and_radius_cannot_overshoot() {
        let stroke = stroke(&[
            [0.0, 0.0, 0.0],
            [10.0, 2.0, 0.2],
            [20.0, 8.0, 0.8],
            [30.0, 18.0, 1.0],
        ]);
        let mut vertices = vec![Vertex {
            point: stroke.source_point(1),
            keep: true,
        }];
        let curve = span(&stroke, 2);
        flatten(curve, 0.001, 0, &mut vertices);
        assert!(vertices.len() > 2);
        assert!(vertices.iter().any(|v| {
            let t = (v.point[0] - 10.0) / 10.0;
            (v.point[1] - (2.0 + 6.0 * t)).abs() > 0.2
        }));
        let low = stroke.source_point(1)[2];
        let high = stroke.source_point(2)[2];
        for pair in vertices.windows(2) {
            assert!(pair[1].point[2] >= pair[0].point[2]);
            assert!((low..=high).contains(&pair[1].point[2]));
        }
        // The derivative at a shared, smooth sample agrees from either side.
        let next = span(&stroke, 3);
        for field in 0..2 {
            assert!(
                ((curve[3][field] - curve[2][field]) - (next[1][field] - next[0][field])).abs()
                    < 0.00001
            );
        }
    }
    #[test]
    fn coarse_tolerance_reduces_geometry_without_losing_endpoints() {
        let stroke = wave(128);
        let mut scratch = Scratch::default();
        let fine = scratch.render(&stroke, 0, 0.01);
        let coarse = scratch.render(&stroke, 0, 2.0);
        assert!(coarse * 2 < fine, "fine={fine}, coarse={coarse}");
        assert_eq!(&scratch.output[..3], stroke.source_point(0));
        assert_eq!(
            &scratch.output[scratch.output.len() - 3..],
            stroke.source_point(127)
        );
    }
    #[test]
    fn append_changes_only_previous_tail_span_and_chunk_bounds_cover_geometry() {
        let mut stroke = wave(128);
        let stable = span(&stroke, 126);
        let old_tail = span(&stroke, 127);
        std::rc::Rc::get_mut(&mut stroke.points)
            .unwrap()
            .push(Point::from_precise(
                f64::from(128.0_f32 * 0.6),
                f64::from((128.0_f32 * 0.055).sin() * 12.0),
                0.5,
            ).unwrap());
        assert_eq!(stable, span(&stroke, 126));
        assert_ne!(old_tail, span(&stroke, 127));
        let mut scratch = Scratch::default();
        for chunk in 0..2 {
            let bounds = chunk_bounds(&stroke, chunk).unwrap();
            scratch.render(&stroke, chunk, 0.001);
            for point in scratch.output.as_chunks::<3>().0 {
                assert!(point[0] - point[2] >= bounds[0] - 0.0001);
                assert!(point[1] - point[2] >= bounds[1] - 0.0001);
                assert!(point[0] + point[2] <= bounds[2] + 0.0001);
                assert!(point[1] + point[2] <= bounds[3] + 0.0001);
            }
        }
    }
    #[test]
    fn output_is_bounded_for_extreme_detail_and_invalid_chunks_are_empty() {
        let stroke = wave(128);
        let mut scratch = Scratch::default();
        assert!(scratch.render(&stroke, 0, 0.000001) <= MAX_CHUNK_SEGMENTS);
        assert_eq!(scratch.render(&stroke, usize::MAX, 0.25), 0);
        assert!(scratch.output.is_empty());
        assert!(chunk_bounds(&stroke, usize::MAX).is_none());
    }
}
