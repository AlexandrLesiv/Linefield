//! Only acknowledged batches enter this slot; cleanup never retires uncommitted data.
use super::save_idle::{State, IDLE};
use std::rc::Rc;
/// 0 empty/finished, 1 pending, u32::MAX invalid budget. Each unit drops either
/// one shared Rc, one <=256-point block, or one empty source container.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn idle_cleanup(budget: usize) -> u32 {
    if budget == 0 || budget > 64 {
        return u32::MAX;
    }
    IDLE.with(|s| {
        let mut s = s.borrow_mut();
        for _ in 0..budget {
            let State {
                retired, points, ..
            } = &mut *s;
            let Some(batch) = retired.as_mut() else {
                return 0;
            };
            if let Some(p) = points.as_mut() {
                if let Some(block) = p.blocks.pop() {
                    p.len -= block.len();
                    drop(block);
                } else {
                    *points = None;
                }
                continue;
            }
            let Some(block) = batch.sources.blocks.last_mut() else {
                // All element destructors already ran in bounded steps. The final
                // byte allocations have trivial elements; allocator time is measured.
                *retired = None;
                return 0;
            };
            if let Some((_, source)) = block.entries.pop() {
                batch.sources.len -= 1;
                match Rc::try_unwrap(source) {
                    Ok(p) => *points = Some(p),
                    Err(shared) => drop(shared),
                }
            } else {
                batch.sources.blocks.pop();
            }
        }
        1
    })
}
