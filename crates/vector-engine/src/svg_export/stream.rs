use super::{Job, STATE};
fn produce(j: &mut Job, tolerance: f64) -> Option<usize> {
    if j.layout.state != 0 && (j.layout.state != 2 || tolerance != 0.25 / j.layout.view[4]) {
        return None;
    }
    j.group_last = false;
    if !tolerance.is_finite()
        || !(0.0001..=0.25).contains(&tolerance)
        || j.tolerance.is_some_and(|t| t != tolerance)
    {
        return None;
    }
    j.tolerance = Some(tolerance);
    if j.current.is_none() && super::images::next_before_stroke(j) {
        return super::images::produce(j);
    }
    if j.current.is_none() {
        let Some((_, item)) = j.items.pop_first() else {
            j.state = 3;
            return Some(0);
        };
        j.current = Some(item);
        j.chunk = 0;
        j.consumed = 0;
    }
    let item = j.current.as_ref()?;
    let s = &item.stroke;
    let origin = j.origin?;
    let place = [
        s.placement(0)?.relative_to(origin[0]),
        s.placement(1)?.relative_to(origin[1]),
    ];
    let [a, b] = s.basis;
    let scale = a.hypot(b);
    if !scale.is_finite() || scale <= 0.0 {
        return None;
    }
    if j.consumed == 0 {
        j.scratch.render(s, j.chunk, tolerance / scale);
    }
    let end = (j.consumed + 6144).min(j.scratch.output.len());
    if end == 0 {
        return None;
    }
    let bounds = crate::geometry_wide::chunk_bounds(s, j.chunk)?;
    let mut world_bounds = [
        f64::INFINITY,
        f64::INFINITY,
        f64::NEG_INFINITY,
        f64::NEG_INFINITY,
    ];
    for x in [bounds[0], bounds[2]] {
        for y in [bounds[1], bounds[3]] {
            let point = [place[0] + a * x - b * y, place[1] + b * x + a * y];
            for axis in 0..2 {
                world_bounds[axis] = world_bounds[axis].min(point[axis]);
                world_bounds[axis + 2] = world_bounds[axis + 2].max(point[axis]);
            }
        }
    }
    if world_bounds
        .iter()
        .any(|n| !n.is_finite() || n.abs() > 4294967296.0)
    {
        return None;
    }
    let last_chunk = crate::geometry_wide::chunk_range(s, j.chunk + 1).is_none();
    let last = end == j.scratch.output.len() && last_chunk;
    if last {
        let key = item.group();
        j.group_last = j
            .items
            .first_key_value()
            .is_none_or(|(_, next)| next.group() != key);
    }
    j.output.clear();
    j.output.extend_from_slice(&[
        1.0,
        item.id as f64,
        s.source as f64,
        s.blend_group as f64,
        s.layer as f64,
        item.rank as f64,
        s.brush as f64,
        s.color as f64,
        s.opacity as f64,
        f64::from(s.width) * scale,
        a,
        b,
        s.offset[0],
        s.offset[1],
        place[0],
        place[1],
        j.chunk as f64,
        last as u8 as f64,
        world_bounds[0],
        world_bounds[1],
        world_bounds[2],
        world_bounds[3],
        j.settings[0] as f64,
        j.settings[1] as f64,
    ]);
    for p in j.scratch.output[j.consumed..end].chunks_exact(3) {
        let point = [
            place[0] + a * p[0] - b * p[1],
            place[1] + b * p[0] + a * p[1],
            p[2] * scale,
        ];
        if point
            .iter()
            .any(|n| !n.is_finite() || n.abs() > 4294967296.0)
        {
            return None;
        }
        j.output.extend_from_slice(&point);
    }
    j.consumed = end;
    if end == j.scratch.output.len() {
        j.consumed = 0;
        j.chunk += 1;
        if last {
            j.retired.push(j.current.take()?.stroke.points);
        }
    }
    Some(j.output.len())
}
/// Copy exactly returned f64 count before the next call. Zero means done or failed;
/// consult svg_status. Maximum packet24+6144 doubles. Tolerance is output world units.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn svg_next(token: u32, tolerance: f64) -> usize {
    STATE.with(|s| {
        let mut s = s.borrow_mut();
        let Some(j) = s.job.as_mut().filter(|j| j.token == token && j.state == 2) else {
            return 0;
        };
        match produce(j, tolerance) {
            Some(n) => n,
            None => {
                j.state = 5;
                j.output.clear();
                0
            }
        }
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn svg_output_ptr(token: u32) -> *const f64 {
    STATE.with(|s| {
        s.borrow()
            .job
            .as_ref()
            .filter(|j| j.token == token)
            .map_or(std::ptr::null(), |j| j.output.as_ptr())
    })
}
