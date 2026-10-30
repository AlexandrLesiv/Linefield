//! Immutable image references share the stroke ordering and bounded export lifecycle.
use super::{Job, STATE};
use std::ops::Bound::{Excluded, Unbounded};
pub(super) fn capture(j: &mut Job, e: &crate::Engine) {
    let end = (j.image_cursor + 64).min(j.image_count);
    for index in j.image_cursor..end {
        let i = &e.images[index];
        if !e.image_visible(crate::images::TAG + index) || i.opacity <= 0.0 {
            continue;
        }
        // Regional zero preserves the global output-pixel sampling grid.
        j.origin
            .get_or_insert(i.anchor.map(|a| crate::regional::Address {
                region: a.region,
                local: 0.0,
            }));
        j.images.insert(
            (e.layers[i.layer].rank.unwrap(), i.before_source, index),
            i.clone(),
        );
    }
    j.image_cursor = end;
}
pub(super) fn next_before_stroke(j: &Job) -> bool {
    let Some((&(rank, source, _), _)) = j.images.first_key_value() else {
        return false;
    };
    j.items
        .first_key_value()
        .is_none_or(|(&(r, s, _, _), _)| (rank, source) <= (r, s))
}
pub(super) fn produce(j: &mut Job) -> Option<usize> {
    let ((rank, source, index), i) = j.images.pop_first()?;
    let p = i.corners(j.origin?)[0];
    if p.iter().any(|v| !v.is_finite() || v.abs() > 4294967296.0) {
        return None;
    }
    j.image_digest = i.digest;
    j.group_last = true;
    j.output.clear();
    j.output.extend_from_slice(&[
        2.0,
        (crate::images::TAG + index) as f64,
        source as f64,
        0.0,
        i.layer as f64,
        rank as f64,
        0.0,
        0.0,
        i.opacity,
        0.0,
        i.basis[0],
        i.basis[1],
        0.0,
        0.0,
        p[0],
        p[1],
        0.0,
        1.0,
        i.width as f64,
        i.height as f64,
        i.mime as f64,
        i.bytes as f64,
        0.0,
        0.0,
    ]);
    Some(24)
}
pub(super) fn measure(j: &mut Job) -> Option<()> {
    let next = if let Some(key) = j.layout.image_key {
        j.images.range((Excluded(key), Unbounded)).next()
    } else {
        j.images.first_key_value()
    };
    let Some((&key, i)) = next else {
        j.layout.images_done = true;
        return Some(());
    };
    let mut bounds = j.layout.bounds.unwrap_or([
        f64::INFINITY,
        f64::INFINITY,
        f64::NEG_INFINITY,
        f64::NEG_INFINITY,
    ]);
    for p in i.corners(j.origin?) {
        if p.iter().any(|n| !n.is_finite() || n.abs() > 4294967296.0) {
            return None;
        }
        for axis in 0..2 {
            bounds[axis] = bounds[axis].min(p[axis]);
            bounds[axis + 2] = bounds[axis + 2].max(p[axis]);
        }
    }
    j.layout.bounds = Some(bounds);
    j.layout.image_key = Some(key);
    j.layout.groups += 1;
    Some(())
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn svg_image_digest_ptr(token: u32) -> *const u8 {
    STATE.with(|s| {
        s.borrow()
            .job
            .as_ref()
            .filter(|j| j.token == token && j.output.first() == Some(&2.0))
            .map_or(std::ptr::null(), |j| j.image_digest.as_ptr())
    })
}
