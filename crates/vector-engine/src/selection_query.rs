//! Canonical eligibility and front-to-back order for host-supplied query geometry.
use super::ENGINE;

#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn selection_eligible(id: usize, active_layer_only: u32) -> u32 {
    if active_layer_only > 1 {
        return 0;
    }
    ENGINE.with(|engine| {
        let engine = engine.borrow();
        if let Some(t) = engine.text(id) {
            return (engine.object_editable(id)
                && t.opacity > 0.0
                && (active_layer_only == 0 || t.layer == engine.active_layer))
                as u32;
        }
        if let Some(i) = engine.image(id) {
            return (engine.object_editable(id)
                && (i.opacity * 255.0).round() != 0.0
                && (active_layer_only == 0 || i.layer == engine.active_layer))
                as u32;
        }
        engine.strokes.get(id).is_some_and(|stroke| {
            engine.stroke_visible(id) && !engine.layers[stroke.layer].locked
                // Preserve the approved host's f64 byte-opacity rounding.
                && (f64::from(stroke.opacity) * 255.0).round() != 0.0
                && (active_layer_only == 0 || stroke.layer == engine.active_layer)
        }) as u32
    })
}
/// Valid selectable IDs sort by descending layer rank, source order, then ID.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn selection_precedes(a: usize, b: usize) -> u32 {
    ENGINE.with(|engine| {
        let engine = engine.borrow();
        let key = |id| {
            if let Some(t) = engine.text(id) {
                return engine.layers[t.layer]
                    .rank
                    .map(|r| (r, t.before_source, 0, t.order));
            }
            if let Some(i) = engine.image(id) {
                return engine.layers[i.layer]
                    .rank
                    .map(|r| (r, i.before_source, 0, i.order));
            }
            engine.strokes.get(id).and_then(|stroke: &super::Stroke| {
                engine.layers[stroke.layer]
                    .rank
                    .map(|rank| (rank, stroke.source, 1, id))
            })
        };
        match (key(a), key(b)) {
            (Some(a), Some(b)) => (a > b) as u32,
            _ => 0,
        }
    })
}

/// Selection rotation from source-local drag vectors. Snap uses the approved
/// JavaScript nearest-step rule (ties toward positive infinity), not Rust round.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn selection_drag_angle(x: f64, y: f64, sx: f64, sy: f64, snap: u32) -> f64 {
    if snap > 1 || ![x, y, sx, sy].iter().all(|v| v.is_finite()) {
        return f64::NAN;
    }
    let angle = y.atan2(x) - sy.atan2(sx);
    if snap == 0 {
        return angle;
    }
    let step = std::f64::consts::PI / 12.0;
    let units = angle / step;
    let lower = units.floor();
    let rounded = if units - lower < 0.5 {
        lower
    } else {
        lower + 1.0
    };
    if rounded == 0.0 && angle.is_sign_negative() {
        -0.0
    } else {
        rounded * step
    }
}

/// Shared proportional-resize policy; hosts supply drag vectors, not limits.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn selection_drag_scale(x: f64, y: f64, sx: f64, sy: f64) -> f64 {
    if ![x, y, sx, sy].iter().all(|v| v.is_finite()) {
        return f64::NAN;
    }
    let scale = (x * sx + y * sy) / (sx * sx + sy * sy).max(1e-20);
    if scale.is_nan() {
        return scale;
    }
    scale.clamp(0.01, 100.0)
}
