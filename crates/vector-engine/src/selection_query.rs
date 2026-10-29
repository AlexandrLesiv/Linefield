//! Canonical eligibility and front-to-back order for host-supplied query geometry.
use super::ENGINE;

#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn selection_eligible(id: usize, active_layer_only: u32) -> u32 {
    if active_layer_only > 1 {
        return 0;
    }
    ENGINE.with(|engine| {
        let engine = engine.borrow();
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
            engine.strokes.get(id).and_then(|stroke: &super::Stroke| {
                engine.layers[stroke.layer]
                    .rank
                    .map(|rank| (rank, stroke.source, id))
            })
        };
        match (key(a), key(b)) {
            (Some(a), Some(b)) => (a > b) as u32,
            _ => 0,
        }
    })
}
