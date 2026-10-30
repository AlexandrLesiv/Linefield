use super::text_boundary::OUTPUT;
use crate::{regional::Address, ENGINE};
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn text_count() -> usize {
    ENGINE.with(|e| e.borrow().texts.len())
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn text_exists(id: usize) -> u32 {
    ENGINE.with(|e| e.borrow().text(id).is_some() as u32)
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn text_content_ptr(id: usize) -> *const u8 {
    ENGINE.with(|e| {
        e.borrow()
            .text(id)
            .map_or(std::ptr::null(), |t| t.content.as_ptr())
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn text_output_ptr() -> *const f64 {
    OUTPUT.with(|o| o.borrow().as_ptr())
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn text_read(id: usize, rx: i64, x: f64, ry: i64, y: f64) -> u32 {
    ENGINE.with(|e| {
        let e = e.borrow();
        let Some(t) = e.text(id) else { return 0 };
        let Some(ox) = Address::normalized(rx, x) else {
            return 0;
        };
        let Some(oy) = Address::normalized(ry, y) else {
            return 0;
        };
        let p = t.corners([ox, oy])[0];
        OUTPUT.with(|o| {
            *o.borrow_mut() = [
                id as f64,
                t.layer as f64,
                e.layers[t.layer].rank.map_or(-1.0, |r| r as f64),
                t.before_source as f64,
                t.order as f64,
                t.color as f64,
                t.opacity,
                e.text_visible(id) as u32 as f64,
                e.layers[t.layer].locked as u32 as f64,
                p[0],
                p[1],
                t.basis[0],
                t.basis[1],
                t.width,
                t.height,
                t.revision as f64,
                1.0,
                t.content.len() as f64,
                t.ink_x,
                t.baseline,
            ]
        });
        1
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn text_fingerprint_word(index: usize) -> u32 {
    crate::text_generated::TEXT_FINGERPRINT
        .get(index)
        .copied()
        .unwrap_or(0)
}
/// Existing image descriptor remains ABI stable; mixed painter order is queried separately.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn text_image_order(id: usize) -> usize {
    ENGINE.with(|e| e.borrow().image(id).map_or(usize::MAX, |i| i.order))
}

#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn text_retained_bytes() -> usize {
    crate::text_content::Content::retained()
}
