//! Scalar image boundary. Digest input is copied only after durable host staging.
use crate::{
    images::{Image, CAP, TAG},
    layers::Command,
    regional::Address,
    ENGINE,
};
use std::cell::RefCell;
thread_local! {
    static DIGEST: RefCell<[u8;64]> = const { RefCell::new([0;64]) };
    static OUTPUT: RefCell<[f64;15]> = const { RefCell::new([0.0;15]) };
    static ERROR: RefCell<u32> = const { RefCell::new(0) };
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn image_digest_input_ptr() -> *mut u8 {
    DIGEST.with(|d| d.borrow_mut().as_mut_ptr())
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn image_error() -> u32 {
    ERROR.with(|e| *e.borrow())
}
/// Errors:1invalid,2protected/stale gesture,3resource; failure leaves history intact.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn image_add(
    mime: u32,
    width: u32,
    height: u32,
    bytes: u32,
    layer: usize,
    rx: i64,
    x: f64,
    ry: i64,
    y: f64,
    zoom: f64,
    angle: f64,
    vw: f64,
    vh: f64,
) -> usize {
    let result = ENGINE.with(|e| {
        let mut e = e.borrow_mut();
        if e.active.is_some()
            || !e.moving.is_empty()
            || e.slicing.is_some()
            || !e
                .layers
                .get(layer)
                .is_some_and(|l| l.rank.is_some() && l.visible && !l.locked)
        {
            return Err(2);
        }
        if ![x, y, zoom, angle, vw, vh].iter().all(|n| n.is_finite())
            || zoom <= 0.0
            || vw <= 0.0
            || vh <= 0.0
            || width == 0
            || height == 0
        {
            return Err(1);
        }
        let scale = (0.8 * vw / (zoom * f64::from(width)))
            .min(0.8 * vh / (zoom * f64::from(height)))
            .min(1.0);
        let (sin, cos) = (-angle).sin_cos();
        let a = scale * cos;
        let b = scale * sin;
        let image = Image {
            digest: DIGEST.with(|d| *d.borrow()),
            mime,
            width,
            height,
            bytes,
            layer,
            before_source: e.strokes.len(),
            anchor: [
                Address::normalized(rx, x).ok_or(1u32)?,
                Address::normalized(ry, y).ok_or(1u32)?,
            ],
            basis: [a, b],
            offset: [
                (-a * f64::from(width) + b * f64::from(height)) / 2.0,
                (-b * f64::from(width) - a * f64::from(height)) / 2.0,
            ],
            opacity: 1.0,
            visible: true,
            retired: false,
            abandoned: false,
        };
        if !image.valid() || e.images.iter().any(|old| !image.same_asset(old)) {
            return Err(1);
        }
        if e.images.len() >= CAP
            || !e.image_budget(Some(&image), None, None)
            || e.images.try_reserve(1).is_err()
        {
            return Err(3);
        }
        let id = TAG + e.images.len();
        e.images.push(image);
        e.record(Command::Image(id));
        e.layer_render_revision = e.layer_render_revision.wrapping_add(1);
        Ok(id)
    });
    ERROR.with(|e| *e.borrow_mut() = result.as_ref().err().copied().unwrap_or(0));
    result.unwrap_or(usize::MAX)
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn image_count() -> usize {
    ENGINE.with(|e| e.borrow().images.len())
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn image_exists(id: usize) -> u32 {
    ENGINE.with(|e| e.borrow().image(id).is_some() as u32)
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn image_digest_ptr(id: usize) -> *const u8 {
    ENGINE.with(|e| {
        e.borrow()
            .image(id)
            .map_or(std::ptr::null(), |i| i.digest.as_ptr())
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn image_output_ptr() -> *const f64 {
    OUTPUT.with(|o| o.borrow().as_ptr())
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn image_read(id: usize, rx: i64, x: f64, ry: i64, y: f64) -> u32 {
    ENGINE.with(|e| {
        let e = e.borrow();
        let Some(i) = e.image(id) else { return 0 };
        let (Some(ox), Some(oy)) = (Address::normalized(rx, x), Address::normalized(ry, y)) else {
            return 0;
        };
        let l = &e.layers[i.layer];
        OUTPUT.with(|o| {
            *o.borrow_mut() = [
                id as f64,
                i.layer as f64,
                l.rank.map_or(-1.0, |r| r as f64),
                i.before_source as f64,
                i.width as f64,
                i.height as f64,
                i.mime as f64,
                i.bytes as f64,
                i.opacity,
                e.image_visible(id) as u8 as f64,
                l.locked as u8 as f64,
                i.anchor[0].relative_to(ox) + i.offset[0],
                i.anchor[1].relative_to(oy) + i.offset[1],
                i.basis[0],
                i.basis[1],
            ]
        });
        1
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn image_opacity(id: usize, opacity: f64) -> u32 {
    ENGINE.with(|e| {
        let mut e = e.borrow_mut();
        if !e.object_editable(id)
            || id < TAG
            || !(0.0..=1.0).contains(&opacity)
            || !e.image_budget(None, None, Some((id, opacity)))
        {
            return 0;
        }
        let old = e.images[id - TAG].opacity;
        if old == opacity {
            return 1;
        }
        e.images[id - TAG].opacity = opacity;
        e.record(Command::ImageOpacity(id, old, opacity));
        e.layer_render_revision = e.layer_render_revision.wrapping_add(1);
        1
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn image_asset_validate(
    mime: u32,
    width: u32,
    height: u32,
    bytes: u32,
    version: u32,
) -> u32 {
    (version == 1
        && (1..=3).contains(&mime)
        && width > 0
        && height > 0
        && u64::from(width) * u64::from(height) <= 16_777_216
        && (1..=crate::images::ENCODED_CAP).contains(&bytes)) as u32
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn image_fingerprint_word(index: usize) -> u32 {
    crate::image_generated::IMAGE_FINGERPRINT
        .get(index)
        .copied()
        .unwrap_or(0)
}
