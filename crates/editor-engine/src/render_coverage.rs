use crate::Metrics;
type Point = [f64; 2];
fn transform(m: [f64; 6], [x, y]: Point) -> Point {
    [m[0] * x + m[1] * y + m[4], m[2] * x + m[3] * y + m[5]]
}
// A convex quad clipped to a rectangle has at most eight vertices. Fixed storage;
// conservative one-pixel source expansion covers sampling and arithmetic edge uncertainty.
pub(crate) fn covers(old: [f64; 6], next: [f64; 6], metrics: Metrics) -> bool {
    if next[..4] != [1.0, 0.0, 0.0, 1.0] {
        return false;
    }
    let w = (metrics.width * metrics.backing).ceil();
    let h = (metrics.height * metrics.backing).ceil();
    let mut points = [[0.0; 2]; 12];
    for (to, from) in points.iter_mut().zip([
        [-1.0, -1.0],
        [w + 1.0, -1.0],
        [w + 1.0, h + 1.0],
        [-1.0, h + 1.0],
    ]) {
        *to = transform(old, from);
    }
    if points[..4].iter().flatten().any(|v| !v.is_finite()) || next.iter().any(|v| !v.is_finite()) {
        return false;
    }
    let mut count = 4;
    for (axis, bound, sign) in [(0, 0.0, 1.0), (0, w, -1.0), (1, 0.0, 1.0), (1, h, -1.0)] {
        if count == 0 {
            return true;
        }
        let mut output = [[0.0; 2]; 12];
        let mut length = 0;
        let mut a = points[count - 1];
        for b in points[..count].iter().copied() {
            let da = (a[axis] - bound) * sign;
            let db = (b[axis] - bound) * sign;
            if (da >= 0.0) != (db >= 0.0) {
                let t = da / (da - db);
                let mut p = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
                p[axis] = bound;
                if length == output.len() {
                    return false;
                }
                output[length] = p;
                length += 1;
            }
            if db >= 0.0 {
                if length == output.len() {
                    return false;
                }
                output[length] = b;
                length += 1;
            }
            a = b;
        }
        points = output;
        count = length;
    }
    let [x, y] = [next[4], next[5]];
    points[..count].iter().all(|p| {
        p.iter().all(|v| v.is_finite())
            && (x == 0.0 || x <= -1.0 || p[0] >= x + 1.0)
            && (x == 0.0 || x >= 1.0 || p[0] <= x + w - 1.0)
            && (y == 0.0 || y <= -1.0 || p[1] >= y + 1.0)
            && (y == 0.0 || y >= 1.0 || p[1] <= y + h - 1.0)
    })
}
