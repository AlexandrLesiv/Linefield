//! Immutable editable label export snapshots; host rasterizes the exact captured content.
use super::{Job, STATE};
use std::ops::Bound::{Excluded, Unbounded};
pub(super) fn capture(j: &mut Job, e: &crate::Engine) {
    let end = (j.text_cursor + 64).min(j.text_count);
    for id in j.text_cursor..end {
        let t = &e.texts[id];
        if !e.text_visible(crate::texts::TAG + id) || t.opacity <= 0.0 {
            continue;
        }
        let Some(bytes) = j.retained.checked_add(t.content.len()) else {
            j.state = 5;
            j.error = 6;
            return;
        };
        if bytes > 128 * 1024 * 1024 {
            j.state = 5;
            j.error = 6;
            return;
        }
        j.retained = bytes;
        j.origin
            .get_or_insert(t.anchor.map(|a| crate::regional::Address {
                region: a.region,
                local: 0.0,
            }));
        j.texts.insert(
            (e.layers[t.layer].rank.unwrap(), t.before_source, t.order),
            t.clone(),
        );
    }
    j.text_cursor = end;
}
pub(super) fn next(j: &Job) -> bool {
    let Some((&key, _)) = j.texts.first_key_value() else {
        return false;
    };
    j.images.first_key_value().is_none_or(|(k, _)| key < *k)
        && j.items
            .first_key_value()
            .is_none_or(|(&(r, s, _, _), _)| (key.0, key.1) <= (r, s))
}
pub(super) fn produce(j: &mut Job) -> Option<usize> {
    let ((rank, source, order), t) = j.texts.pop_first()?;
    let p = t.corners(j.origin?)[0];
    if p.iter().any(|v| !v.is_finite() || v.abs() > 4294967296.0) {
        return None;
    }
    j.group_last = true;
    j.text_content = Some(t.content.clone());
    j.output.clear();
    j.output.extend_from_slice(&[
        3.0,
        order as f64,
        source as f64,
        0.0,
        t.layer as f64,
        rank as f64,
        0.0,
        t.color as f64,
        t.opacity,
        0.0,
        t.basis[0],
        t.basis[1],
        0.0,
        0.0,
        p[0],
        p[1],
        0.0,
        1.0,
        t.width,
        t.height,
        1.0,
        t.content.len() as f64,
        t.revision as f64,
        t.ink_x,
        t.baseline,
        0.0,
    ]);
    Some(26)
}
pub(super) fn measure(j: &mut Job) -> Option<()> {
    let next = if let Some(key) = j.layout.text_key {
        j.texts.range((Excluded(key), Unbounded)).next()
    } else {
        j.texts.first_key_value()
    };
    let Some((&key, t)) = next else {
        j.layout.texts_done = true;
        return Some(());
    };
    let mut b = j.layout.bounds.unwrap_or([
        f64::INFINITY,
        f64::INFINITY,
        f64::NEG_INFINITY,
        f64::NEG_INFINITY,
    ]);
    for p in t.corners(j.origin?) {
        if p.iter().any(|v| !v.is_finite() || v.abs() > 4294967296.0) {
            return None;
        }
        for a in 0..2 {
            b[a] = b[a].min(p[a]);
            b[a + 2] = b[a + 2].max(p[a]);
        }
    }
    j.layout.bounds = Some(b);
    j.layout.text_key = Some(key);
    j.layout.groups += 1;
    Some(())
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn svg_text_content_ptr(token: u32) -> *const u8 {
    STATE.with(|s| {
        s.borrow()
            .job
            .as_ref()
            .filter(|j| j.token == token && j.output.first() == Some(&3.0))
            .and_then(|j| j.text_content.as_ref())
            .map_or(std::ptr::null(), |t| t.as_ptr())
    })
}
