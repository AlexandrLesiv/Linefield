//! Bounded wide-coordinate preparation using the same shared geometry policy.
use super::{geometry_wide, Stroke, ENGINE, SNAPSHOT_CAPACITY};
use std::cell::RefCell;
thread_local! {
 pub(super) static INPUT: RefCell<[f64; SNAPSHOT_CAPACITY]> = const { RefCell::new([0.0; SNAPSHOT_CAPACITY]) };
 pub(super) static SCRATCH: RefCell<geometry_wide::Scratch> = RefCell::new(geometry_wide::Scratch::default());
 static BOUNDS: RefCell<[f64;4]> = const { RefCell::new([f64::NAN;4]) };
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn geometry_input_f64_ptr() -> *mut f64 {
    INPUT.with(|v| v.borrow_mut().as_mut_ptr())
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn render_chunk_f64_ptr() -> *const f64 {
    SCRATCH.with(|v| v.borrow().output.as_ptr())
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn render_chunk_f64(id: usize, chunk: usize, tolerance: f64) -> usize {
    ENGINE.with(|e| {
        let e = e.borrow();
        SCRATCH.with(|v| {
            let mut v = v.borrow_mut();
            v.output.clear();
            e.strokes
                .get(id)
                .map_or(0, |s| v.render(s, chunk, tolerance))
        })
    })
}
pub(crate) fn requires_wide(stroke: &Stroke, chunk: usize) -> bool {
    let Some(range) = geometry_wide::chunk_range(stroke, chunk) else {
        return false;
    };
    let first =
        (stroke.parameter(range.start.saturating_sub(1)).floor() as usize).saturating_sub(1);
    let last = (stroke.parameter(range.end - 1).ceil() as usize + 1).min(stroke.points.len() - 1);
    (first..=last).any(|i| {
        let p = stroke.points[i];
        p.x.relative_to(stroke.source_anchor[0]).abs() > 65536.0
            || p.y.relative_to(stroke.source_anchor[1]).abs() > 65536.0
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn geometry_requires_f64(id: usize, chunk: usize) -> u32 {
    ENGINE.with(|e| {
        e.borrow()
            .strokes
            .get(id)
            .is_some_and(|s| requires_wide(s, chunk)) as u32
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn raw_chunk_bounds_f64_ptr(id: usize, chunk: usize) -> *const f64 {
    let bounds = ENGINE.with(|e| {
        e.borrow()
            .strokes
            .get(id)
            .and_then(|s| geometry_wide::chunk_bounds(s, chunk))
            .unwrap_or([f64::NAN; 4])
    });
    BOUNDS.with(|v| {
        let mut v = v.borrow_mut();
        *v = bounds;
        v.as_ptr()
    })
}
