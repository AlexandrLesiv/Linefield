//! Stream into a separate model; only validated publish changes the live Engine.
use super::{save_delta, save_replay_model::Model, save_replay_stream::Batch, ENGINE};
use std::cell::RefCell;
#[derive(Default)]
pub(super) struct Session {
    pub generation: u32,
    live_revision: u64,
    live_generation: u32,
    pub model: Option<Model>,
    pub batch: Option<Batch>,
    pub failed: bool,
    pub checkpoint: Option<super::save_compact_stream::Checkpoint>,
}
impl Session {
    fn poison(&mut self) -> u32 {
        self.failed = true;
        0
    }
}
thread_local! {pub(super) static RESTORE:RefCell<Session>=RefCell::new(Session::default());static INPUT:RefCell<[u8;65520]>=const {RefCell::new([0;65520])};}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn restore_begin() -> u32 {
    RESTORE.with(|s| {
        let mut s = s.borrow_mut();
        if s.model.is_some() || s.batch.is_some() {
            return 0;
        }
        let Some(generation) = s.generation.checked_add(1) else {
            return 0;
        };
        *s = Session {
            generation,
            live_revision: save_delta::JOURNAL.with(|j| j.borrow().revision),
            live_generation: save_delta::JOURNAL.with(|j| j.borrow().generation),
            model: Some(Model::default()),
            ..Session::default()
        };
        generation
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn restore_batch_begin(token: u32, count: usize, base: u64, result: u64) -> u32 {
    RESTORE.with(|s| {
        let mut s = s.borrow_mut();
        if token == 0 || s.generation != token {
            return 0;
        }
        if s.failed
            || s.batch.is_some()
            || s.checkpoint.is_some()
            || count == 0
            || count > 100001
            || result <= base
            || s.model.as_ref().is_none_or(|m| m.revision != base)
        {
            return s.poison();
        }
        s.batch = Some(Batch::new(count, base, result));
        1
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn restore_input_ptr() -> *mut u8 {
    INPUT.with(|i| i.borrow_mut().as_mut_ptr())
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn restore_append(token: u32, stream: usize, length: usize) -> u32 {
    RESTORE.with(|s| {
        let mut s = s.borrow_mut();
        if token == 0 || s.generation != token || s.failed {
            return 0;
        }
        if length > 65520 {
            return s.poison();
        }
        let Session { batch, model, .. } = &mut *s;
        let valid = batch
            .as_mut()
            .zip(model.as_mut())
            .and_then(|(b, m)| INPUT.with(|i| b.append(stream, &i.borrow()[..length], m)))
            .is_some();
        if valid {
            1
        } else {
            s.poison()
        }
    })
}
/// Sources are now decoded. Reread the identical immutable metadata stream.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn restore_metadata_replay(token: u32) -> u32 {
    RESTORE.with(|s| {
        let mut s = s.borrow_mut();
        if token == 0 || s.generation != token || s.failed {
            return 0;
        }
        let Session { batch, model, .. } = &mut *s;
        if batch
            .as_mut()
            .zip(model.as_ref())
            .and_then(|(b, m)| b.replay(m))
            .is_some()
        {
            1
        } else {
            s.poison()
        }
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn restore_batch_end(token: u32) -> u32 {
    RESTORE.with(|s| {
        let mut s = s.borrow_mut();
        if token == 0 || s.generation != token || s.failed {
            return 0;
        }
        let Session { batch, model, .. } = &mut *s;
        let valid = batch.as_ref().zip(model.as_mut()).and_then(|(b,m)|b.finish(m)).is_some();
        if valid {
            s.batch = None;
            1
        } else {
            s.poison()
        }
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn restore_publish(token: u32) -> u32 {
    RESTORE.with(|s| {
        let mut s = s.borrow_mut();
        if token == 0 || s.generation != token || s.failed || s.batch.is_some() {
            return 0;
        }
        let unchanged = save_delta::JOURNAL.with(|j| {
            let j = j.borrow();
            !j.overflow && j.revision == s.live_revision && j.generation == s.live_generation
        });
        let idle = ENGINE.with(|e| {
            let e = e.borrow();
            e.active.is_none()
                && e.moving.is_empty()
                && e.slicing.is_none()
                && e.deleting.is_empty()
        });
        if !unchanged || !idle {
            return 0;
        }
        let Some(m) = s.model.as_ref() else {
            return 0;
        };
        let Some(e) = m.engine() else {
            return s.poison();
        };
        if !save_delta::reset(&e, m.revision, &m.sources) {
            return 0;
        }
        ENGINE.with(|live| *live.borrow_mut() = e);
        s.failed = true;
        1
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn restore_cancel(token: u32) -> u32 {
    RESTORE.with(|s| {
        let mut s = s.borrow_mut();
        if token == 0 || s.generation != token {
            return 0;
        }
        s.poison();
        1
    })
}
/// Retire unpublished/consumed data in bounded blocks after cancellation/publication.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn restore_cleanup(token: u32, budget: usize) -> u32 {
    RESTORE.with(|s| {
        let mut s = s.borrow_mut();
        if token == 0 || s.generation != token || !s.failed || budget == 0 || budget > 64 {
            return 0;
        }
        if let Some(batch) = s.batch.as_mut() {
            if !batch.retire(budget) {
                return 1;
            }
            s.batch = None;
        }
        if let Some(model) = s.model.as_mut() {
            if !model.retire(budget) {
                return 1;
            }
            s.model = None;
        }
        2
    })
}
