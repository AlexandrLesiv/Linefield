//! Bounded digest iteration over sealed save batches and unpublished replay models.
use crate::{images::Image, save_idle::IDLE, save_replay::RESTORE};
use std::{
    cell::RefCell,
    ops::Bound::{Excluded, Unbounded},
};
thread_local! {static ASSET:RefCell<([u8;64],[f64;5])>=const{RefCell::new(([0;64],[0.0;5]))};}
fn publish(i: &Image) -> u32 {
    ASSET.with(|a| {
        *a.borrow_mut() = (
            i.digest,
            [
                1.0,
                i.mime as f64,
                i.width as f64,
                i.height as f64,
                i.bytes as f64,
            ],
        )
    });
    1
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn image_asset_digest_ptr() -> *const u8 {
    ASSET.with(|a| a.borrow().0.as_ptr())
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn image_asset_output_ptr() -> *const f64 {
    ASSET.with(|a| a.borrow().1.as_ptr())
}
/// Reset=1 starts/restarts iteration; returns1entry,2done,0invalid. Copy outputs before next call.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn image_idle_asset_next(token: u32, reset: u32) -> u32 {
    if reset > 1 {
        return 0;
    }
    IDLE.with(|s| {
        let mut s = s.borrow_mut();
        let Some(b) = s.active.as_mut().filter(|b| b.token == token) else {
            return 0;
        };
        if reset == 1 {
            b.asset_cursor = None;
        }
        let next = if let Some(key) = b.asset_cursor {
            b.assets.range((Excluded(key), Unbounded)).next()
        } else {
            b.assets.first_key_value()
        };
        let Some((&key, i)) = next else {
            return 2;
        };
        let out = publish(i);
        b.asset_cursor = Some(key);
        out
    })
}
/// Replay index is an image slot. Return1entry,2end,0invalid; images are contiguous.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn image_restore_asset(token: u32, index: usize) -> u32 {
    RESTORE.with(|s| {
        let s = s.borrow();
        if s.generation != token || s.failed || s.batch.is_some() {
            return 0;
        }
        let Some(m) = s.model.as_ref() else {
            return 0;
        };
        m.images
            .get(&index)
            .map_or(if index == m.images.len() { 2 } else { 0 }, |i| {
                if i.retired {
                    3
                } else {
                    publish(i)
                }
            })
    })
}
