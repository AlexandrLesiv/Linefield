//! New labels start upright in the captured view while retaining natural size.
use super::text_boundary::{content, result, room};
use crate::{
    layers::Command,
    regional::Address,
    texts::{Text, CAP, TAG},
    ENGINE,
};
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn text_create(
    len: usize,
    color: u32,
    opacity: f64,
    width: f64,
    height: f64,
    ink_x: f64,
    baseline: f64,
    layer: usize,
    rx: i64,
    x: f64,
    ry: i64,
    y: f64,
    rotation: f64,
) -> usize {
    result(ENGINE.with(|e| {
        let mut e = e.borrow_mut();
        if !rotation.is_finite() {
            return Err(1);
        }
        let (b, a) = (-rotation).sin_cos();
        if e.active.is_some()
            || !e.moving.is_empty()
            || !e.deleting.is_empty()
            || e.slicing.is_some()
            || !e
                .layers
                .get(layer)
                .is_some_and(|l| l.rank.is_some() && l.visible && !l.locked)
        {
            return Err(2);
        }
        if e.texts.len() >= CAP || !room(len) {
            return Err(3);
        }
        let t = Text {
            content: content(len)?,
            color,
            opacity,
            width,
            height,
            ink_x,
            baseline,
            revision: 1,
            layer,
            before_source: e.strokes.len(),
            order: e.next_object_order(),
            anchor: [
                Address::normalized(rx, x).ok_or(1u32)?,
                Address::normalized(ry, y).ok_or(1u32)?,
            ],
            basis: [a, b],
            offset: [
                (-a * width + b * height) / 2.0,
                (-b * width - a * height) / 2.0,
            ],
            visible: true,
        };
        if !t.valid() {
            return Err(1);
        }
        e.texts.try_reserve(1).map_err(|_| 3u32)?;
        let id = TAG + e.texts.len();
        e.texts.push(t);
        e.record(Command::Text(id));
        e.layer_render_revision = e.layer_render_revision.wrapping_add(1);
        Ok(id)
    }))
}
