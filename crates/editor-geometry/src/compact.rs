use crate::{Point, bounds::edge_error};
/// Simplify only the disposable polygonal approximation, preserving every raw sample.
/// Distance-to-segment plus interpolated-radius error is convex on each original segment.
/// Checking every original endpoint bounds the entire polygonal painted edge.
pub fn compact(points: &[Point], tolerance: f64, max_span: f64, out: &mut Vec<[Point; 2]>) {
    out.clear();
    if points.len() < 2 {
        return;
    }
    let mut stack = [(0usize, 0usize); 128];
    stack[0] = (0, points.len() - 1);
    let mut len = 1;
    while len > 0 {
        len -= 1;
        let (first, last) = stack[len];
        let a = points[first];
        let b = points[last];
        let mut worst = tolerance;
        let mut split = None;
        for (i, p) in points.iter().enumerate().take(last).skip(first + 1) {
            let before = points[i - 1];
            let after = points[i + 1];
            let u = [p[0] - before[0], p[1] - before[1]];
            let v = [after[0] - p[0], after[1] - p[1]];
            let lengths = u[0].hypot(u[1]) * v[0].hypot(v[1]);
            let extreme = (p[2] - before[2]) * (after[2] - p[2]) < 0.0;
            if extreme || (lengths > 0.0 && (u[0] * v[0] + u[1] * v[1]) / lengths < 0.35) {
                split = Some(i);
                break;
            }
            let error = edge_error(*p, a, b);
            if error > worst {
                worst = error;
                split = Some(i);
            }
        }
        if (b[0] - a[0]).abs().max((b[1] - a[1]).abs()) > max_span && last > first + 1 {
            split = Some(first + (last - first) / 2);
        }
        if let Some(mid) = split {
            stack[len] = (mid, last);
            stack[len + 1] = (first, mid);
            len += 2;
        } else {
            out.push([a, b]);
        }
    }
}
