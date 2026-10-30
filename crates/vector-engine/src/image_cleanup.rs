//! Proven metadata retirement; no visibility-based asset deletion or history pruning.
use crate::{images::Image, layers::Command, save_delta, save_idle, save_replay::RESTORE, ENGINE};
fn retained() -> bool {
    #[cfg(feature = "svg-export")]
    if crate::svg_export::owned() {
        return true;
    }
    save_idle::owned() || RESTORE.with(|s| s.borrow().model.is_some())
}
fn interaction(e: &crate::Engine) -> bool {
    e.active.is_some() || !e.moving.is_empty() || !e.deleting.is_empty() || e.slicing.is_some()
}
/// Visit<=64 stable slots. MAX means blocked/invalid; resume cursor or restart0 later.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn image_cleanup_step(cursor: usize, budget: usize) -> usize {
    if budget == 0 || budget > 64 || retained() {
        return usize::MAX;
    }
    ENGINE.with(|e| {
        let mut e = e.borrow_mut();
        if interaction(&e) || cursor > e.images.len() {
            return usize::MAX;
        }
        let history_empty = e.undo.is_empty() && e.redo.is_empty();
        let end = (cursor + budget).min(e.images.len());
        let mut ids = Vec::new();
        for index in cursor..end {
            let image = &e.images[index];
            if !image.retired && !image.visible && (image.abandoned || history_empty) {
                ids.push(crate::images::TAG + index);
                e.images[index] = Image::tombstone();
                e.selected.remove(crate::images::TAG + index);
            }
        }
        if !ids.is_empty() {
            save_delta::completed(&e, &Command::ImageRetire(ids));
            e.layer_render_revision = e.layer_render_revision.wrapping_add(1);
        }
        end
    })
}
/// A host GC proof additionally needs same grant/HEAD and a durable checkpoint barrier.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn image_cleanup_revision() -> u64 {
    if retained() || ENGINE.with(|e| interaction(&e.borrow())) {
        return u64::MAX;
    }
    save_delta::JOURNAL.with(|j| {
        let j = j.borrow();
        if j.overflow || j.revision != j.durable {
            u64::MAX
        } else {
            j.revision
        }
    })
}
