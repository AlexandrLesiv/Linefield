//! Rust binds a receipt to the immutable body and configured document/session.
use super::{save_delta::JOURNAL, save_idle, save_seal::SEAL};
use serde_json::Value;
use std::cell::RefCell;
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn save_boundary_fingerprint(index: usize) -> u32 {
    super::save_boundary_generated::SAVE_FINGERPRINT
        .get(index)
        .copied()
        .unwrap_or(0)
}
thread_local! {
    pub(super) static CONTEXT: RefCell<Option<Value>> = const {RefCell::new(None)};
    static INPUT: RefCell<[u8;2048]> = const {RefCell::new([0;2048])};
}
pub(super) fn input(length: usize) -> Option<Value> {
    if length == 0 || length > 2048 {
        return None;
    }
    INPUT.with(|i| serde_json::from_slice(&i.borrow()[..length]).ok())
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn save_input_ptr() -> *mut u8 {
    INPUT.with(|i| i.borrow_mut().as_mut_ptr())
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn save_configure(length: usize) -> u32 {
    if save_idle::owned()
        || JOURNAL.with(|j| {
            let j = j.borrow();
            j.overflow || j.batch.is_some() || j.revision != j.durable
        })
    {
        return 0;
    }
    let Some(value) = input(length) else {
        return 0;
    };
    let Some(object) = value.as_object().filter(|v| v.len() == 4) else {
        return 0;
    };
    for key in ["document", "incarnation", "grant", "session"] {
        let Some(id) = object.get(key).and_then(Value::as_str) else {
            return 0;
        };
        if id.is_empty()
            || id.len() > if key == "session" { 40 } else { 64 }
            || !id
                .bytes()
                .all(|c| c.is_ascii_alphanumeric() || c == b'_' || c == b'-')
        {
            return 0;
        }
    }
    CONTEXT.with(|c| *c.borrow_mut() = Some(value));
    1
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn save_request_ptr(token: u32) -> *const u8 {
    SEAL.with(|s| {
        s.borrow()
            .as_ref()
            .filter(|s| s.token == token)
            .map_or(std::ptr::null(), |s| s.request.as_ptr())
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn save_request_len(token: u32) -> usize {
    SEAL.with(|s| {
        s.borrow()
            .as_ref()
            .filter(|s| s.token == token)
            .map_or(0, |s| s.request.len())
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn save_receipt(token: u32, length: usize) -> u32 {
    let Some(value) = input(length) else {
        return 0;
    };
    SEAL.with(|slot| {
        let mut slot = slot.borrow_mut();
        let Some(seal) = slot
            .as_ref()
            .filter(|s| s.token == token && !s.request.is_empty())
        else {
            return 0;
        };
        let Some(receipt) = value.as_object().filter(|r| r.len() == 8) else {
            return 0;
        };
        if receipt.get("outcome").and_then(Value::as_str) != Some("committed") {
            return 0;
        }
        let expected: Value = serde_json::from_slice(&seal.request).unwrap();
        if expected
            .as_object()
            .unwrap()
            .iter()
            .any(|(k, v)| receipt.get(k) != Some(v))
        {
            return 0;
        }
        if save_idle::acknowledge(token, seal.base, seal.result) != 1 {
            return 0;
        }
        *slot = None;
        1
    })
}
