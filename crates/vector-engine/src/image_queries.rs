//! Queries derive from canonical rectangles, never disposable texture bounds.
use crate::{regional::Address, ENGINE};
pub(super) fn corners(id: usize, rx: i64, ry: i64) -> Option<[[f64; 2]; 4]> {
    ENGINE.with(|e| {
        e.borrow().image(id).map(|i| {
            i.corners([
                Address {
                    region: rx,
                    local: 0.0,
                },
                Address {
                    region: ry,
                    local: 0.0,
                },
            ])
        })
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn image_bounds(id: usize, rx: i64, ry: i64, angle: f64, index: usize) -> f64 {
    if index > 3 || !angle.is_finite() {
        return f64::NAN;
    }
    let Some(points) = corners(id, rx, ry) else {
        return f64::NAN;
    };
    let (s, c) = angle.sin_cos();
    let mut bounds = [
        f64::INFINITY,
        f64::INFINITY,
        f64::NEG_INFINITY,
        f64::NEG_INFINITY,
    ];
    for [x, y] in points {
        let p = [c * x + s * y, -s * x + c * y];
        for a in 0..2 {
            bounds[a] = bounds[a].min(p[a]);
            bounds[a + 2] = bounds[a + 2].max(p[a]);
        }
    }
    bounds[index]
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn image_hit(id: usize, rx: i64, ry: i64, x: f64, y: f64, pad: f64) -> u32 {
    if ![x, y, pad].iter().all(|n| n.is_finite()) || pad < 0.0 {
        return 0;
    }
    ENGINE.with(|e| {
        let e = e.borrow();
        let Some(i) = e.image(id) else {
            return 0;
        };
        let p = i.corners([
            Address {
                region: rx,
                local: 0.0,
            },
            Address {
                region: ry,
                local: 0.0,
            },
        ])[0];
        let [a, b] = i.basis;
        let den = a * a + b * b;
        let dx = x - p[0];
        let dy = y - p[1];
        let local = [(a * dx + b * dy) / den, (-b * dx + a * dy) / den];
        let margin = pad / den.sqrt();
        (local[0] >= -margin
            && local[1] >= -margin
            && local[0] <= i.width as f64 + margin
            && local[1] <= i.height as f64 + margin) as u32
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn image_lasso(id: usize, rx: i64, ry: i64, partial: u32) -> u32 {
    if partial > 1 {
        return 0;
    }
    let Some(points) = corners(id, rx, ry) else {
        return 0;
    };
    crate::lasso::image_match(points, partial == 1) as u32
}
