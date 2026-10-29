//! Isolated checkpoint: one retained capture, bounded encoded staging, no I/O.
use super::{
    save_metadata::{capture, Snapshot},
    ENGINE,
};
use std::cell::RefCell;
const CHUNK: usize = 65_520; // 1,638 exact 40-byte records.
#[derive(Default)]
struct State {
    generation: u32,
    snapshot: Option<Snapshot>,
    output: Vec<u8>,
}
thread_local! { static SAVE: RefCell<State> = RefCell::new(State::default()); }
/// Returns a snapshot generation, NOT a durable/content revision. Zero means
/// capacity/busy/exhaustion. Failed admission preserves any retained snapshot.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn save_capture() -> u32 {
    SAVE.with(|slot| {
        let mut state = slot.borrow_mut();
        if state.snapshot.is_some() {
            return 0;
        }
        let Some(next) = state.generation.checked_add(1) else {
            return 0;
        };
        let Some(snapshot) = ENGINE.with(|e| capture(&e.borrow())) else {
            return 0;
        };
        state.generation = next;
        state.snapshot = Some(snapshot);
        next
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn save_release(generation: u32) -> u32 {
    SAVE.with(|slot| {
        let mut s = slot.borrow_mut();
        if generation == 0 || s.generation != generation || s.snapshot.is_none() {
            return 0;
        }
        s.snapshot = None;
        s.output.clear();
        1
    })
}
/// Stream zero is metadata; subsequent streams are deduplicated raw sources.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn save_stream_count(generation: u32) -> usize {
    SAVE.with(|slot| {
        let s = slot.borrow();
        s.snapshot
            .as_ref()
            .filter(|_| generation == s.generation)
            .map_or(0, |p| p.sources.len() + 1)
    })
}
/// Fixed-size indexed chunks. usize::MAX is invalid; zero is the exact end.
/// Copy output before another chunk/release; Wasm memory may grow on calls.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn save_chunk(generation: u32, stream: usize, chunk: usize) -> usize {
    SAVE.with(|slot| {
        let mut s = slot.borrow_mut();
        let State {
            generation: current,
            snapshot,
            output,
        } = &mut *s;
        output.clear();
        let Some(p) = snapshot.as_ref().filter(|_| *current == generation) else {
            return usize::MAX;
        };
        let Some(start) = chunk.checked_mul(CHUNK) else {
            return usize::MAX;
        };
        if stream == 0 {
            if start > p.metadata.len() {
                return usize::MAX;
            }
            output.extend_from_slice(&p.metadata[start..(start + CHUNK).min(p.metadata.len())]);
        } else {
            let Some(points) = p.sources.get(stream - 1) else {
                return usize::MAX;
            };
            let first = start / 40;
            if first > points.len() {
                return usize::MAX;
            }
            for i in first..(first + CHUNK / 40).min(points.len()) {
                let point = points[i];
                for a in [point.x, point.y] {
                    output.extend_from_slice(&a.region.to_le_bytes());
                    output.extend_from_slice(&a.local.to_le_bytes());
                }
                output.extend_from_slice(&point.pressure.to_le_bytes());
                output.extend_from_slice(&0u32.to_le_bytes());
            }
        }
        output.len()
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn save_chunk_ptr() -> *const u8 {
    SAVE.with(|slot| slot.borrow().output.as_ptr())
}
