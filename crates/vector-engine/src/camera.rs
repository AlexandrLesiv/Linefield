//! Shared view-to-document arithmetic. Hosts acquire viewport-local events and
//! retain presentation state; Rust defines inverse mapping and anchored changes.
use std::cell::RefCell;
thread_local! { static OUTPUT: RefCell<[f64; 3]> = const { RefCell::new([0.0; 3]) }; }
fn valid(values: &[f64], zoom: f64) -> bool {
    zoom > 0.0 && values.iter().all(|value| value.is_finite())
}
fn mapped(x: f64, y: f64, cx: f64, cy: f64, zoom: f64, angle: f64) -> [f64; 2] {
    let dx = (x - cx) / zoom;
    let dy = (y - cy) / zoom;
    let c = angle.cos();
    let s = angle.sin();
    [c * dx + s * dy, -s * dx + c * dy]
}
fn publish(values: [f64; 3]) -> u32 {
    if !values.iter().all(|value| value.is_finite()) {
        return 0;
    }
    OUTPUT.with(|output| *output.borrow_mut() = values);
    1
}
/// Three f64 values, overwritten by the next successful camera operation.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn camera_output_ptr() -> *const f64 {
    OUTPUT.with(|output| output.borrow().as_ptr())
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn camera_normalize(angle: f64) -> f64 {
    let turn = 2.0 * std::f64::consts::PI;
    let value = (((angle + std::f64::consts::PI) % turn + turn) % turn) - std::f64::consts::PI;
    if value.abs() < 1e-12 {
        0.0
    } else {
        value
    }
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn camera_map(x: f64, y: f64, cx: f64, cy: f64, zoom: f64, angle: f64) -> u32 {
    if !valid(&[x, y, cx, cy, zoom, angle], zoom) {
        return 0;
    }
    let [wx, wy] = mapped(x, y, cx, cy, zoom, angle);
    publish([wx, wy, 0.0])
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn camera_zoom(x: f64, y: f64, cx: f64, cy: f64, zoom: f64, next: f64) -> u32 {
    if !valid(&[x, y, cx, cy, zoom, next], zoom) || next <= 0.0 {
        return 0;
    }
    publish([
        x - ((x - cx) * next) / zoom,
        y - ((y - cy) * next) / zoom,
        next,
    ])
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn camera_rotate(
    x: f64,
    y: f64,
    cx: f64,
    cy: f64,
    zoom: f64,
    angle: f64,
    next: f64,
) -> u32 {
    if !valid(&[x, y, cx, cy, zoom, angle, next], zoom) {
        return 0;
    }
    let [wx, wy] = mapped(x, y, cx, cy, zoom, angle);
    let rotation = camera_normalize(next);
    let c = rotation.cos();
    let s = rotation.sin();
    publish([
        x - zoom * (c * wx - s * wy),
        y - zoom * (s * wx + c * wy),
        rotation,
    ])
}

/// Acquire one screen-local sample relative to an explicit regional render origin.
/// Mapping and canonical admission occur in one owning-engine call: hosts never
/// flatten the origin into a floating-point world coordinate.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn camera_push(
    x: f64, y: f64, cx: f64, cy: f64, zoom: f64, angle: f64,
    rx: i64, ry: i64, pressure: f32,
) -> u32 {
    if !valid(&[x, y, cx, cy, zoom, angle], zoom) { return 0; }
    let [wx, wy] = mapped(x, y, cx, cy, zoom, angle);
    super::push_regional(rx, wx, ry, wy, pressure)
}

thread_local! { static ORIGIN: RefCell<[i64; 2]> = const { RefCell::new([0, 0]) }; }
/// Rebase only after the local camera exceeds four regions. Output is published
/// atomically; hosts adopt it together with derived rendering/query state.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn camera_rebase(rx: i64, ry: i64, cx: f64, cy: f64, zoom: f64, angle: f64) -> u32 {
    if !valid(&[cx, cy, zoom, angle], zoom) { return 0; }
    let [x, y] = mapped(0.0, 0.0, cx, cy, zoom, angle);
    if x.abs().max(y.abs()) < 262144.0 { return 0; }
    let (Some(x), Some(y)) = (super::regional::Address::normalized(rx, x), super::regional::Address::normalized(ry, y)) else { return 0; };
    let dx = (i128::from(x.region) - i128::from(rx)) as f64 * 65536.0;
    let dy = (i128::from(y.region) - i128::from(ry)) as f64 * 65536.0;
    let c = angle.cos(); let s = angle.sin();
    if publish([cx + zoom * (c * dx - s * dy), cy + zoom * (s * dx + c * dy), zoom]) == 0 { return 0; }
    ORIGIN.with(|origin| *origin.borrow_mut() = [x.region, y.region]);
    1
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn camera_origin_region(axis: usize) -> i64 {
    ORIGIN.with(|origin| origin.borrow().get(axis).copied().unwrap_or(0))
}
