use crate::{Code, Stroke, geometry_cursor::Continuation, geometry_precision::page_extent};
use linefield_editor_geometry::Point;

pub(crate) struct PackedPage {
    pub data: Vec<f32>,
    pub origin: [f64; 2],
    pub bounds: [f64; 4],
    pub centers: [f64; 4],
    pub done: bool,
}

pub(crate) fn pack(
    continuation: &mut Continuation,
    stroke: &Stroke,
    detail: f64,
) -> Result<PackedPage, Code> {
    let mut points: Vec<Point> = Vec::new();
    points.try_reserve_exact(2048).map_err(|_| Code::Capacity)?;
    let mut centers = [
        f64::INFINITY,
        f64::INFINITY,
        f64::NEG_INFINITY,
        f64::NEG_INFINITY,
    ];
    let mut done = true;
    while let Some(pair) = continuation.next(stroke)? {
        let mut next = centers;
        for p in pair {
            for axis in 0..2 {
                next[axis] = next[axis].min(p[axis]);
                next[axis + 2] = next[axis + 2].max(p[axis]);
            }
        }
        if points.len() == 2048
            || (0..2).any(|axis| next[axis + 2] - next[axis] > 2.0 * page_extent(detail))
        {
            continuation.pending = Some(pair);
            done = false;
            break;
        }
        centers = next;
        points.extend(pair);
    }
    if points.is_empty() {
        return Err(Code::Invalid);
    }
    // Pack once about the endpoint hull's center. Do not repeatedly shift rounded f32 data.
    let origin = std::array::from_fn(|axis| centers[axis] * 0.5 + centers[axis + 2] * 0.5);
    let mut data = Vec::new();
    data.try_reserve_exact(points.len() * 3)
        .map_err(|_| Code::Capacity)?;
    let mut bounds = [
        f64::INFINITY,
        f64::INFINITY,
        f64::NEG_INFINITY,
        f64::NEG_INFINITY,
    ];
    for p in points {
        let values = [p[0] - origin[0], p[1] - origin[1], p[2]];
        if values[..2].iter().any(|v| v.abs() > page_extent(detail)) {
            return Err(Code::NumericalCapacity);
        }
        for axis in 0..2 {
            bounds[axis] = bounds[axis].min(values[axis] - values[2]);
            bounds[axis + 2] = bounds[axis + 2].max(values[axis] + values[2]);
        }
        for v in values {
            let f = v as f32;
            if !f.is_finite() || (v - f as f64).abs() * detail > 0.01 {
                return Err(Code::NumericalCapacity);
            }
            data.push(f);
        }
    }
    for axis in 0..2 {
        centers[axis] -= origin[axis];
        centers[axis + 2] -= origin[axis];
    }
    Ok(PackedPage {
        data,
        origin,
        bounds,
        centers,
        done,
    })
}
