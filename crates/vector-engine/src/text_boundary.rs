//! Atomic UTF-8 content and versioned host layout receipt boundary.
use crate::{
    layers::Command,
    regional::Address,
    texts::{Text, BYTES, CAP, TAG},
    ENGINE,
};
use std::{cell::RefCell, rc::Rc};
thread_local! {static INPUT:RefCell<[u8;BYTES]>=const{RefCell::new([0;BYTES])};pub(super) static OUTPUT:RefCell<[f64;20]>=const{RefCell::new([0.0;20])};static ERROR:RefCell<u32>=const{RefCell::new(0)};}
fn content(len: usize) -> Result<Rc<crate::text_content::Content>, u32> {
    if len == 0 || len > BYTES {
        return Err(1);
    }
    INPUT.with(|b| {
        std::str::from_utf8(&b.borrow()[..len])
            .ok()
            .filter(|s| !s.contains('\0') && s.split('\n').count() <= 256)
            .ok_or(1u32)
            .and_then(|s| crate::text_content::Content::new(s).ok_or(3u32))
    })
}
fn room(len: usize) -> bool {
    #[cfg(feature = "save-incremental")]
    {
        crate::save_delta::JOURNAL.with(|j| {
            let j = j.borrow();
            !j.overflow
                && j.records < 100_000
                && j.operations < 100_000
                && j.pending
                    .len()
                    .checked_add(len)
                    .and_then(|n| n.checked_add(153))
                    .is_some_and(|n| n <= 32 * 1024 * 1024)
        })
    }
    #[cfg(not(feature = "save-incremental"))]
    {
        true
    }
}
fn result(r: Result<usize, u32>) -> usize {
    ERROR.with(|e| *e.borrow_mut() = r.as_ref().err().copied().unwrap_or(0));
    r.unwrap_or(usize::MAX)
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn text_input_ptr() -> *mut u8 {
    INPUT.with(|b| b.borrow_mut().as_mut_ptr())
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn text_error() -> u32 {
    ERROR.with(|e| *e.borrow())
}
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
) -> usize {
    result(ENGINE.with(|e| {
        let mut e = e.borrow_mut();
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
            basis: [1.0, 0.0],
            offset: [-width / 2.0, -height / 2.0],
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
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn text_edit(
    id: usize,
    revision: u32,
    expected_document: u64,
    len: usize,
    color: u32,
    opacity: f64,
    width: f64,
    height: f64,
    ink_x: f64,
    baseline: f64,
) -> u32 {
    let r = ENGINE.with(|e| {
        let mut e = e.borrow_mut();
        let old = e.text(id).ok_or(1u32)?.clone();
        #[cfg(feature = "save-incremental")]
        if crate::save_delta::JOURNAL.with(|j| j.borrow().revision) != expected_document {
            return Err(2);
        }
        #[cfg(not(feature = "save-incremental"))]
        if expected_document != 0 {
            return Err(2);
        }
        if old.revision != revision
            || !e.object_editable(id)
            || e.active.is_some()
            || !e.moving.is_empty()
            || !e.deleting.is_empty()
            || e.slicing.is_some()
        {
            return Err(2);
        }
        let mut next = old.clone();
        if len > BYTES {
            return Err(1);
        }
        let same = INPUT.with(|b| &b.borrow()[..len] == old.content.as_bytes());
        next.content = if same {
            old.content.clone()
        } else {
            content(len)?
        };
        next.color = color;
        next.opacity = opacity;
        next.width = width;
        next.height = height;
        let dx = (old.width - width) / 2.0;
        let dy = (old.height - height) / 2.0;
        next.offset = [
            old.offset[0] + old.basis[0] * dx - old.basis[1] * dy,
            old.offset[1] + old.basis[1] * dx + old.basis[0] * dy,
        ];
        next.ink_x = ink_x;
        next.baseline = baseline;
        next.revision = old.revision.checked_add(1).ok_or(3u32)?;
        if !next.valid() {
            return Err(1);
        }
        if old.content == next.content
            && old.color == color
            && old.opacity == opacity
            && old.width == width
            && old.height == height
            && old.ink_x == ink_x
            && old.baseline == baseline
        {
            return Ok(id);
        }
        if !room(len) {
            return Err(3);
        }
        e.texts[id - TAG] = next.clone();
        e.record(Command::TextEdit(id, Box::new(old), Box::new(next)));
        e.layer_render_revision = e.layer_render_revision.wrapping_add(1);
        Ok(id)
    });
    (result(r) != usize::MAX) as u32
}
