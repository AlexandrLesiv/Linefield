//! Shared title validation, with a bounded disposable host-to-Rust UTF-8 buffer.
use std::cell::RefCell;
thread_local! {static INPUT:RefCell<[u8;1024]>=const {RefCell::new([0;1024])};}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn catalog_title_input_ptr() -> *mut u8 {
    INPUT.with(|input| input.borrow_mut().as_mut_ptr())
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn catalog_title_valid(length: usize) -> u32 {
    if length > super::catalog::TITLE_BYTES {
        return 0;
    }
    INPUT.with(|input| {
        std::str::from_utf8(&input.borrow()[..length]).is_ok_and(super::catalog::valid_title) as u32
    })
}
