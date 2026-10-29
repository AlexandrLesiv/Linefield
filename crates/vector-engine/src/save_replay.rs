//! Decode into a separate model; only validated publish changes the live Engine.
use super::{save_delta, save_replay_model::Model, ENGINE};
use std::cell::RefCell;
#[derive(Default)]
struct Session {
    generation: u32,
    live_revision: u64,
    live_generation: u32,
    model: Option<Model>,
    streams: Option<Vec<Vec<u8>>>,
    expected: Option<(u64, u64)>,
    total: usize,
    failed: bool,
}
thread_local! {static RESTORE:RefCell<Session>=RefCell::new(Session::default());static INPUT:RefCell<[u8;65520]>=const {RefCell::new([0;65520])};}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn restore_begin() -> u32 {
    RESTORE.with(|s| {
        let mut s = s.borrow_mut();
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
            || s.model.is_none()
            || s.streams.is_some()
            || count == 0
            || count > 100001
            || result <= base
            || s.model.as_ref().is_none_or(|m| m.revision != base)
        {
            s.failed = true;
            return 0;
        }
        s.streams = Some(vec![vec![]; count]);
        s.expected = Some((base, result));
        s.total = 0;
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
        if length > 65520 || s.total + length > 72 * 1024 * 1024 {
            s.failed = true;
            return 0;
        }
        let Some(out) = s.streams.as_mut().and_then(|v| v.get_mut(stream)) else {
            s.failed = true;
            return 0;
        };
        INPUT.with(|i| out.extend_from_slice(&i.borrow()[..length]));
        s.total += length;
        1
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn restore_batch_end(token: u32) -> u32 {
    RESTORE.with(|s| {
        let mut s = s.borrow_mut();
        if token == 0 || s.generation != token || s.failed {
            return 0;
        }
        let Some(streams) = s.streams.take() else {
            return 0;
        };
        let Some((base, result)) = s.expected.take() else {
            s.failed = true;
            return 0;
        };
        let Some(next) = s
            .model
            .as_ref()
            .and_then(|m| m.apply(&streams, base, result))
        else {
            s.failed = true;
            return 0;
        };
        s.model = Some(next);
        1
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn restore_publish(token: u32) -> u32 {
    RESTORE.with(|s| {
        let mut s = s.borrow_mut();
        if token == 0 || s.generation != token || s.failed || s.streams.is_some() {
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
            return 0;
        };
        if !save_delta::reset(&e, m.revision, &m.sources) {
            return 0;
        }
        ENGINE.with(|live| *live.borrow_mut() = e);
        s.model = None;
        1
    })
}
