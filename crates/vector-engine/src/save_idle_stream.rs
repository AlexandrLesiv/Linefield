//! Virtual concatenation preserves LFD3 exactly without constructing a giant byte Vec.
use super::{
    save_delta_wire,
    save_idle::{Batch, IDLE},
};
const CHUNK: usize = 65520;
fn metadata(b: &Batch, start: usize, out: &mut Vec<u8>) -> Option<()> {
    let descriptors_end = 32 + b.sources.len * 8;
    let total = descriptors_end + b.pending.len();
    if start > total {
        return None;
    }
    let end = (start + CHUNK).min(total);
    let mut at = start;
    if at < 32 {
        let stop = end.min(32);
        out.extend_from_slice(&b.header[at..stop]);
        at = stop;
    }
    while at < end && at < descriptors_end {
        let descriptor = &b.sources.blocks.get((at - 32) / 2048)?.descriptors;
        let offset = (at - 32) % 2048;
        let count = (descriptor.len() - offset).min(end - at);
        out.extend_from_slice(&descriptor[offset..offset + count]);
        at += count;
    }
    if at < end {
        out.extend_from_slice(&b.pending[at - descriptors_end..end - descriptors_end]);
    }
    Some(())
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn idle_stream_count(token: u32) -> usize {
    IDLE.with(|s| {
        s.borrow()
            .active
            .as_ref()
            .filter(|b| b.token == token && b.remaining.is_empty())
            .map_or(0, |b| b.sources.len + 1)
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn idle_chunk(token: u32, stream: usize, chunk: usize) -> usize {
    IDLE.with(|s| {
        let mut s = s.borrow_mut();
        let super::save_idle::State { active, output, .. } = &mut *s;
        output.clear();
        let Some(b) = active
            .as_ref()
            .filter(|b| b.token == token && b.remaining.is_empty())
        else {
            return usize::MAX;
        };
        if stream == 0 {
            let Some(start) = chunk.checked_mul(CHUNK) else {
                return usize::MAX;
            };
            if metadata(b, start, output).is_none() {
                return usize::MAX;
            }
        } else {
            let Some((_, points)) = b.sources.get(stream - 1) else {
                return usize::MAX;
            };
            if save_delta_wire::samples(points, chunk, output).is_none() {
                return usize::MAX;
            }
        }
        output.len()
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn idle_chunk_ptr() -> *const u8 {
    IDLE.with(|s| s.borrow().output.as_ptr())
}
