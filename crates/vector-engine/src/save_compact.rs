//! Checked bounded export of a replayed checkpoint. Never reads the editing Engine.
use super::{
    save_compact_stream::Checkpoint,
    save_replay::{Session, RESTORE},
};
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn restore_checkpoint_begin(token: u32) -> u32 {
    RESTORE.with(|s| {
        let mut s = s.borrow_mut();
        if token == 0
            || s.generation != token
            || s.failed
            || s.batch.is_some()
            || s.checkpoint.is_some()
            || s.model.as_ref().is_none_or(|m| m.revision == 0)
        {
            return 0;
        }
        s.checkpoint = Some(Checkpoint::new());
        1
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn restore_checkpoint_step(token: u32, budget: usize) -> u32 {
    RESTORE.with(|s| {
        let mut s = s.borrow_mut();
        if token == 0 || s.generation != token || s.failed || budget == 0 || budget > 64 {
            return 0;
        }
        let Session {
            model, checkpoint, ..
        } = &mut *s;
        match checkpoint
            .as_mut()
            .zip(model.as_ref())
            .and_then(|(c, m)| c.prepare(m, budget))
        {
            Some(true) => 2,
            Some(false) => 1,
            None => 0,
        }
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn restore_checkpoint_count(token: u32) -> usize {
    RESTORE.with(|s| {
        let s = s.borrow();
        if token == 0 || s.generation != token || s.failed {
            return 0;
        }
        s.checkpoint.as_ref().map_or(0, Checkpoint::count)
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn restore_checkpoint_chunk(token: u32, stream: usize, chunk: usize) -> usize {
    RESTORE.with(|s| {
        let mut s = s.borrow_mut();
        if token == 0 || s.generation != token || s.failed {
            return usize::MAX;
        }
        let Session {
            model, checkpoint, ..
        } = &mut *s;
        checkpoint
            .as_mut()
            .zip(model.as_ref())
            .and_then(|(c, m)| c.chunk(m, stream, chunk))
            .unwrap_or(usize::MAX)
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn restore_checkpoint_ptr(token: u32) -> *const u8 {
    RESTORE.with(|s| {
        let s = s.borrow();
        if token == 0 || s.generation != token || s.failed {
            return std::ptr::null();
        }
        s.checkpoint
            .as_ref()
            .map_or(std::ptr::null(), |c| c.output.as_ptr())
    })
}
