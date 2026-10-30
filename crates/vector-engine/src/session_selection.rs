//! Owning-engine session selection. Ordered slots preserve first-selected frame
//! orientation; the index avoids quadratic toggling of large lasso results.
use super::ENGINE;
use std::collections::HashMap;

#[derive(Default)]
pub(super) struct Selection {
    slots: Vec<Option<usize>>,
    index: HashMap<usize, usize>,
    snapshot: Vec<f64>,
    revision: u32,
}
impl Selection {
    pub(super) fn remove(&mut self, id: usize) {
        if let Some(slot) = self.index.remove(&id) {
            self.slots[slot] = None;
            self.revision = self.revision.wrapping_add(1);
        }
    }
    fn compact(&mut self) {
        if self.slots.len() > self.index.len().saturating_mul(2).max(64) {
            self.slots.retain(Option::is_some);
            for (slot, id) in self.slots.iter().enumerate() {
                *self.index.get_mut(&id.unwrap()).unwrap() = slot;
            }
        }
    }
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn session_selection_revision() -> u32 {
    ENGINE.with(|e| e.borrow().selected.revision)
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn session_selection_has(id: usize) -> u32 {
    ENGINE.with(|e| e.borrow().selected.index.contains_key(&id) as u32)
}
/// 1 success/no-op; 0 invalid ID/flag or allocation failure, membership unchanged.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn session_selection_set(id: usize, selected: u32) -> u32 {
    ENGINE.with(|e| {
        let mut e = e.borrow_mut();
        if selected > 1 || !e.object_valid(id) {
            return 0;
        }
        let s = &mut e.selected;
        if selected == 0 {
            s.remove(id);
            s.compact();
            return 1;
        }
        if s.index.contains_key(&id) {
            return 1;
        }
        if s.slots.try_reserve(1).is_err() || s.index.try_reserve(1).is_err() {
            return 0;
        }
        s.index.insert(id, s.slots.len());
        s.slots.push(Some(id));
        s.revision = s.revision.wrapping_add(1);
        1
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn session_selection_clear() {
    ENGINE.with(|e| {
        let s = &mut e.borrow_mut().selected;
        *s = Selection {
            revision: s.revision.wrapping_add(1),
            ..Selection::default()
        };
    });
}
/// Preserve donor pruning: invisible/empty/locked strokes leave selection.
/// Opacity and active-layer query options do not retroactively prune membership.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn session_selection_prune() {
    ENGINE.with(|e| {
        let mut e = e.borrow_mut();
        for slot in 0..e.selected.slots.len() {
            if let Some(id) = e.selected.slots[slot] {
                let keep = e.object_editable(id);
                if !keep {
                    e.selected.remove(id);
                }
            }
        }
        e.selected.compact();
    });
}
/// Disposable ordered f64 IDs (exact for Wasm32 IDs). usize::MAX means allocation
/// failure. Copy before another snapshot/clear; reacquire view after memory growth.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn session_selection_snapshot() -> usize {
    ENGINE.with(|e| {
        let s = &mut e.borrow_mut().selected;
        s.snapshot.clear();
        if s.snapshot.try_reserve(s.index.len()).is_err() {
            return usize::MAX;
        }
        s.snapshot
            .extend(s.slots.iter().flatten().map(|id| *id as f64));
        s.snapshot.len()
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn session_selection_snapshot_ptr() -> *const f64 {
    ENGINE.with(|e| e.borrow().selected.snapshot.as_ptr())
}
