//! Main-thread-only native adapter. The complete ownership contract is in vector_core.h.
use crate::ENGINE;
use std::cell::Cell;

const OK: u32 = 0;
const INVALID_ARGUMENT: u32 = 1;
const INVALID_STROKE: u32 = 2;
const NO_ACTIVE_STROKE: u32 = 3;
const MAX_SEGMENTS: usize = 256;
thread_local! {static ERROR: Cell<u32> = const { Cell::new(OK) };}
fn error(code: u32) {
    ERROR.with(|e| e.set(code));
}
#[no_mangle]
pub extern "C" fn vc_last_error() -> u32 {
    ERROR.with(Cell::get)
}
#[no_mangle]
pub extern "C" fn vc_begin(width: f32, color: u32) -> usize {
    if !width.is_finite() {
        error(INVALID_ARGUMENT);
        return usize::MAX;
    }
    error(OK);
    ENGINE.with(|e| e.borrow_mut().begin(width, color))
}
#[no_mangle]
pub extern "C" fn vc_push(x: f32, y: f32, pressure: f32) {
    if !x.is_finite() || !y.is_finite() || !pressure.is_finite() {
        error(INVALID_ARGUMENT);
        return;
    }
    ENGINE.with(|e| {
        let mut e = e.borrow_mut();
        if e.active.is_none() {
            error(NO_ACTIVE_STROKE);
        } else {
            e.push(x, y, pressure);
            error(OK);
        }
    });
}
#[no_mangle]
pub extern "C" fn vc_commit() {
    ENGINE.with(|e| e.borrow_mut().commit());
    error(OK);
}
#[no_mangle]
pub extern "C" fn vc_cancel() {
    ENGINE.with(|e| e.borrow_mut().cancel());
    error(OK);
}
#[no_mangle]
pub extern "C" fn vc_undo() {
    ENGINE.with(|e| e.borrow_mut().undo());
    error(OK);
}
#[no_mangle]
pub extern "C" fn vc_redo() {
    ENGINE.with(|e| e.borrow_mut().redo());
    error(OK);
}
#[no_mangle]
pub extern "C" fn vc_reset() {
    ENGINE.with(|e| *e.borrow_mut() = Default::default());
    error(OK);
}
#[no_mangle]
pub extern "C" fn vc_count() -> usize {
    error(OK);
    ENGINE.with(|e| e.borrow().strokes.len())
}
fn read_stroke<T: Default>(id: usize, read: impl FnOnce(&crate::Stroke) -> T) -> T {
    ENGINE.with(|e| {
        if let Some(stroke) = e.borrow().strokes.get(id) {
            error(OK);
            read(stroke)
        } else {
            error(INVALID_STROKE);
            T::default()
        }
    })
}
#[no_mangle]
pub extern "C" fn vc_visible(id: usize) -> u32 {
    read_stroke(id, |_| super::visible(id))
}
#[no_mangle]
pub extern "C" fn vc_length(id: usize) -> usize {
    read_stroke(id, |s| s.points.len())
}
#[no_mangle]
pub extern "C" fn vc_color(id: usize) -> u32 {
    read_stroke(id, |s| s.color)
}
/// Copies bounded render geometry into caller-owned storage.
///
/// # Safety
/// For a nonzero copy, output must reference writable, aligned storage for
/// min(capacity, MAX_SEGMENTS) * 6 floats. No other access may overlap this call.
#[no_mangle]
pub unsafe extern "C" fn vc_copy_segments(
    id: usize,
    start: usize,
    capacity: usize,
    output: *mut f32,
) -> usize {
    read_stroke(id, |s| {
        let Some(remaining) = s.points.len().checked_sub(start) else {
            error(INVALID_ARGUMENT);
            return 0;
        };
        let count = remaining.min(capacity).min(MAX_SEGMENTS);
        if count == 0 {
            return 0;
        }
        if output.is_null() || !output.is_aligned() {
            error(INVALID_ARGUMENT);
            return 0;
        }
        // SAFETY: caller guarantees writable storage; count is bounded to 256.
        let target = unsafe { std::slice::from_raw_parts_mut(output, count * 6) };
        for (j, segment) in target.as_chunks_mut::<6>().0.iter_mut().enumerate() {
            let index = start + j;
            segment[..3].copy_from_slice(&s.render_point(index.saturating_sub(1)));
            segment[3..].copy_from_slice(&s.render_point(index));
        }
        count
    })
}
#[no_mangle]
pub extern "C" fn vc_world_coordinate(screen: f32, offset: f32, zoom: f32) -> f32 {
    let result = (screen - offset) / zoom;
    if !screen.is_finite()
        || !offset.is_finite()
        || !zoom.is_finite()
        || zoom <= 0.0
        || !result.is_finite()
    {
        error(INVALID_ARGUMENT);
        return f32::NAN;
    }
    error(OK);
    result
}
