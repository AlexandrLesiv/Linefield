//! Storage-worker integrity codec. It owns no document or editing state.
use sha2::{Digest, Sha256};
use std::cell::RefCell;
thread_local! {
    static HASH: RefCell<Option<Sha256>> = const { RefCell::new(None) };
    static INPUT: RefCell<[u8; 65520]> = const { RefCell::new([0; 65520]) };
    static OUTPUT: RefCell<[u8; 32]> = const { RefCell::new([0; 32]) };
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn storage_hash_begin() {
    HASH.with(|h| *h.borrow_mut() = Some(Sha256::new()));
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn storage_hash_input_ptr() -> *mut u8 {
    INPUT.with(|i| i.borrow_mut().as_mut_ptr())
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn storage_hash_append(length: usize) -> u32 {
    if length > 65520 {
        HASH.with(|h| *h.borrow_mut() = None);
        return 0;
    }
    HASH.with(|h| {
        let mut h = h.borrow_mut();
        let Some(hash) = h.as_mut() else {
            return 0;
        };
        INPUT.with(|i| hash.update(&i.borrow()[..length]));
        1
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn storage_hash_finish() -> *const u8 {
    HASH.with(|h| {
        let Some(hash) = h.borrow_mut().take() else {
            return std::ptr::null();
        };
        OUTPUT.with(|o| {
            let mut out = o.borrow_mut();
            out.copy_from_slice(&hash.finalize());
            out.as_ptr()
        })
    })
}
