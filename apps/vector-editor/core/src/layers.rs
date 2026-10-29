use super::{Engine, ENGINE};
use std::cell::RefCell;

#[derive(Clone, Debug, PartialEq)]
pub(super) struct Layer {
    pub name: String,
    pub visible: bool,
    pub locked: bool,
    pub rank: Option<usize>,
}
impl Layer {
    pub fn new(name: String) -> Self {
        Self {
            name,
            visible: true,
            locked: false,
            rank: Some(0),
        }
    }
}
// History holds small metadata changes and stable stroke IDs, never sample copies.
pub(super) enum Command {
    Stroke(usize),
    Move(Vec<super::selection::Translation>),
    Delete(Vec<usize>),
    Slice(Vec<super::slice::Replacement>),
    Layer(Box<LayerChange>),
}
pub(super) struct LayerChange {
    id: usize,
    before: Layer,
    after: Layer,
    active_before: usize,
    active_after: usize,
}
impl Engine {
    pub(super) fn can_draw(&self) -> bool {
        self.layers
            .get(self.active_layer)
            .is_some_and(|l| l.rank.is_some() && l.visible && !l.locked)
    }
    pub(super) fn stroke_visible(&self, id: usize) -> bool {
        self.strokes.get(id).is_some_and(|s| {
            s.visible && self.layers[s.layer].rank.is_some() && self.layers[s.layer].visible
        })
    }
    pub(super) fn record(&mut self, command: Command) {
        for abandoned in self.redo.drain(..) {
            // Only abandoned stroke creation loses its redo-owned samples.
            // Undoing a layer deletion/hide never makes its ink disposable.
            if let Command::Slice(changes) = &abandoned {
                for c in changes {
                    for &id in &c.fragments {
                        self.strokes[id].points = Default::default();
                        self.strokes[id].slice = None;
                    }
                }
            }
            if let Command::Stroke(id) = abandoned {
                self.strokes[id].points = Default::default();
            }
        }
        self.undo.push(command);
    }
    pub(super) fn apply(&mut self, command: &Command, forward: bool) {
        match command {
            Command::Stroke(id) => self.strokes[*id].visible = forward,
            Command::Move(changes) => self.apply_translations(changes, forward),
            Command::Delete(ids) => {
                for &id in ids {
                    self.strokes[id].visible = !forward;
                }
            }
            Command::Slice(changes) => {
                for change in changes {
                    self.strokes[change.original].visible = !forward;
                    for &id in &change.fragments {
                        self.strokes[id].visible = forward;
                    }
                }
                self.refresh_blend_groups();
                self.layer_render_revision = self.layer_render_revision.wrapping_add(1);
            }
            Command::Layer(change) => {
                let LayerChange {
                    id,
                    before,
                    after,
                    active_before,
                    active_after,
                } = &**change;
                let state = if forward { after } else { before };
                self.layer_order.retain(|other| other != id);
                if let Some(rank) = state.rank {
                    self.layer_order
                        .insert(rank.min(self.layer_order.len()), *id);
                }
                self.layers[*id] = state.clone();
                for (rank, &id) in self.layer_order.iter().enumerate() {
                    self.layers[id].rank = Some(rank);
                }
                self.active_layer = if forward {
                    *active_after
                } else {
                    *active_before
                };
                self.layer_revision = self.layer_revision.wrapping_add(1);
                if before.rank != after.rank || before.visible != after.visible {
                    self.layer_render_revision = self.layer_render_revision.wrapping_add(1);
                }
            }
        }
    }
    fn change_layer(&mut self, id: usize, after: Layer, active_after: usize) -> bool {
        let before = self.layers[id].clone();
        if before == after {
            return false;
        }
        self.cancel_move();
        self.commit();
        let command = Command::Layer(Box::new(LayerChange {
            id,
            before,
            after,
            active_before: self.active_layer,
            active_after,
        }));
        self.apply(&command, true);
        self.record(command);
        true
    }
    fn create_layer(&mut self) -> usize {
        self.cancel_move();
        self.commit();
        let id = self.layers.len();
        let after = Layer {
            rank: Some(self.layers[self.active_layer].rank.unwrap() + 1),
            ..Layer::new(format!("Layer {}", id + 1))
        };
        self.layers.push(Layer {
            rank: None,
            ..after.clone()
        });
        self.change_layer(id, after, id);
        id
    }
    fn select_layer(&mut self, id: usize) -> bool {
        if !self.layers.get(id).is_some_and(|l| l.rank.is_some()) {
            return false;
        }
        self.cancel_move();
        self.commit();
        if self.active_layer != id {
            self.active_layer = id;
            self.layer_revision = self.layer_revision.wrapping_add(1);
        }
        true
    }
    fn edit_layer(&mut self, id: usize, edit: impl FnOnce(&mut Layer)) -> bool {
        let Some(layer) = self.layers.get(id).filter(|l| l.rank.is_some()) else {
            return false;
        };
        let mut after = layer.clone();
        edit(&mut after);
        self.change_layer(id, after, self.active_layer)
    }
    fn delete_layer(&mut self, id: usize) -> bool {
        if self.layer_order.len() <= 1 {
            return false;
        }
        let Some(layer) = self.layers.get(id).filter(|l| l.rank.is_some()) else {
            return false;
        };
        let rank = layer.rank.unwrap();
        let active_after = if self.active_layer == id {
            self.layer_order[if rank > 0 { rank - 1 } else { 1 }]
        } else {
            self.active_layer
        };
        let mut after = layer.clone();
        after.rank = None;
        self.change_layer(id, after, active_after)
    }
}

#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn layer_count() -> usize {
    ENGINE.with(|e| e.borrow().layer_order.len())
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn layer_at(rank: usize) -> usize {
    ENGINE.with(|e| {
        e.borrow()
            .layer_order
            .get(rank)
            .copied()
            .unwrap_or(usize::MAX)
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn layer_active() -> usize {
    ENGINE.with(|e| e.borrow().active_layer)
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn layer_revision() -> u32 {
    ENGINE.with(|e| e.borrow().layer_revision)
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn layer_render_revision() -> u32 {
    ENGINE.with(|e| e.borrow().layer_render_revision)
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn layer_create() -> usize {
    ENGINE.with(|e| e.borrow_mut().create_layer())
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn layer_select(id: usize) -> u32 {
    ENGINE.with(|e| e.borrow_mut().select_layer(id) as u32)
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn layer_delete(id: usize) -> u32 {
    ENGINE.with(|e| e.borrow_mut().delete_layer(id) as u32)
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn layer_move(id: usize, rank: usize) -> u32 {
    ENGINE.with(|e| {
        let mut e = e.borrow_mut();
        let rank = rank.min(e.layer_order.len() - 1);
        e.edit_layer(id, |l| l.rank = Some(rank)) as u32
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn layer_set_visible(id: usize, value: u32) -> u32 {
    ENGINE.with(|e| e.borrow_mut().edit_layer(id, |l| l.visible = value != 0) as u32)
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn layer_set_locked(id: usize, value: u32) -> u32 {
    ENGINE.with(|e| e.borrow_mut().edit_layer(id, |l| l.locked = value != 0) as u32)
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn layer_visible(id: usize) -> u32 {
    ENGINE.with(|e| {
        e.borrow()
            .layers
            .get(id)
            .is_some_and(|l| l.rank.is_some() && l.visible) as u32
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn layer_locked(id: usize) -> u32 {
    ENGINE.with(|e| e.borrow().layers.get(id).is_some_and(|l| l.locked) as u32)
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn stroke_layer(id: usize) -> usize {
    ENGINE.with(|e| e.borrow().strokes.get(id).map_or(usize::MAX, |s| s.layer))
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn stroke_layer_rank(id: usize) -> usize {
    ENGINE.with(|e| {
        let e = e.borrow();
        e.strokes
            .get(id)
            .and_then(|s| e.layers[s.layer].rank)
            .unwrap_or(usize::MAX)
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn can_draw() -> u32 {
    ENGINE.with(|e| e.borrow().can_draw() as u32)
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn can_undo() -> u32 {
    ENGINE.with(|e| (!e.borrow().undo.is_empty()) as u32)
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn can_redo() -> u32 {
    ENGINE.with(|e| (!e.borrow().redo.is_empty()) as u32)
}
// Names are UTF-8, bounded at the ABI. Hosts copy output before any mutation.
thread_local! { static NAME_INPUT: RefCell<[u8;512]> = const { RefCell::new([0;512]) }; }
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn layer_name_input_ptr() -> *mut u8 {
    NAME_INPUT.with(|s| s.borrow_mut().as_mut_ptr())
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn layer_name_ptr(id: usize) -> *const u8 {
    ENGINE.with(|e| {
        e.borrow()
            .layers
            .get(id)
            .map_or(std::ptr::null(), |l| l.name.as_ptr())
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn layer_name_len(id: usize) -> usize {
    ENGINE.with(|e| e.borrow().layers.get(id).map_or(0, |l| l.name.len()))
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn layer_rename(id: usize, len: usize) -> u32 {
    if len > 512 {
        return 0;
    }
    NAME_INPUT.with(|scratch| {
        let scratch = scratch.borrow();
        let Ok(name) = std::str::from_utf8(&scratch[..len]) else {
            return 0;
        };
        let name: String = name
            .trim()
            .chars()
            .filter(|c| !c.is_control())
            .take(128)
            .collect();
        if name.is_empty() {
            return 0;
        }
        ENGINE.with(|e| e.borrow_mut().edit_layer(id, |l| l.name = name) as u32)
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    fn ink(e: &mut Engine) -> usize {
        let id = e.begin_with_style(12.0, 0x123456, Default::default(), 0.375);
        for i in 0..300 {
            e.push(i as f32, (i as f32 * 0.1).sin(), (i % 7) as f32 / 6.0);
        }
        e.commit();
        id
    }
    fn raw(e: &Engine, id: usize) -> Vec<[u32; 3]> {
        (0..e.strokes[id].points.len())
            .map(|i| {
                let p = e.strokes[id].points[i];
                [p.x.to_bits(), p.y.to_bits(), p.pressure.to_bits()]
            })
            .collect()
    }
    #[test]
    fn layer_operations_and_history_preserve_raw_ink_and_order() {
        let mut e = Engine::default();
        let a = ink(&mut e);
        let top = e.create_layer();
        let b = ink(&mut e);
        let original = [raw(&e, a), raw(&e, b)];
        assert_eq!([e.strokes[a].layer, e.strokes[b].layer], [0, top]);
        e.edit_layer(top, |l| l.name = "Details ✎".into());
        e.edit_layer(top, |l| l.rank = Some(0));
        assert_eq!(e.layer_order, [top, 0]);
        e.edit_layer(top, |l| l.visible = false);
        assert!(!e.stroke_visible(b));
        assert!(e.stroke_visible(a));
        e.undo();
        assert!(e.stroke_visible(b));
        e.edit_layer(top, |l| l.locked = true);
        assert!(!e.can_draw());
        assert_eq!(e.begin(6.0, 0), usize::MAX);
        assert!(e.stroke_visible(b));
        e.delete_layer(top);
        assert_eq!(e.active_layer, 0);
        assert!(!e.stroke_visible(b));
        e.undo();
        assert_eq!(e.active_layer, top);
        assert!(e.layers[top].locked);
        assert!(e.stroke_visible(b));
        e.redo();
        e.undo();
        assert_eq!([raw(&e, a), raw(&e, b)], original);
        assert_eq!(e.strokes[b].opacity, 0.375);
        // Abandoning a deletion redo must retain the layer's original raw data.
        e.undo(); // unlock
        ink(&mut e);
        assert_eq!(raw(&e, b), original[1]);
        for _ in 0..e.undo.len() {
            e.undo();
        }
        assert_eq!(e.layer_order, [0]);
        assert_eq!(e.active_layer, 0);
        for _ in 0..e.redo.len() {
            e.redo();
        }
        assert_eq!(raw(&e, a), original[0]);
        assert_eq!(raw(&e, b), original[1]);
    }
    #[test]
    fn selection_and_layer_changes_commit_active_strokes_on_their_original_layer() {
        let mut e = Engine::default();
        let top = e.create_layer();
        let first = e.begin(4.0, 0);
        e.push(3.0, 4.0, 0.25);
        e.select_layer(0);
        assert!(e.active.is_none());
        assert_eq!(e.strokes[first].layer, top);
        let second = e.begin(5.0, 1);
        e.push(8.0, 9.0, 0.75);
        e.edit_layer(0, |l| l.visible = false);
        assert_eq!(e.strokes[second].points.len(), 1);
        assert!(!e.stroke_visible(second));
        e.undo();
        assert!(e.stroke_visible(second));
        e.undo();
        assert!(!e.stroke_visible(second));
        e.redo();
        assert!(e.stroke_visible(second));
        assert_eq!(e.strokes[first].points[0].pressure, 0.25);
        assert_eq!(e.strokes[second].points[0].pressure, 0.75);
    }
    #[test]
    fn invalid_noop_and_last_layer_operations_do_not_add_history() {
        let mut e = Engine::default();
        assert!(!e.delete_layer(0));
        assert!(!e.delete_layer(999));
        assert!(!e.select_layer(999));
        assert!(!e.edit_layer(999, |l| l.locked = true));
        assert!(!e.edit_layer(0, |l| l.visible = true));
        assert!(e.undo.is_empty());
        assert!(e.can_draw());
        let top = e.create_layer();
        e.undo();
        assert!(!e.select_layer(top));
        let replacement = e.create_layer();
        assert!(replacement > top);
        assert_eq!(e.layer_order, [0, replacement]);
        e.redo();
        assert_eq!(e.layer_order, [0, replacement]);
    }
    #[test]
    fn utf8_names_are_bounded_and_invalid_names_do_not_enter_history() {
        ENGINE.with(|e| *e.borrow_mut() = Engine::default());
        let name = "  Water & ink 水彩  ";
        NAME_INPUT.with(|s| s.borrow_mut()[..name.len()].copy_from_slice(name.as_bytes()));
        assert_eq!(layer_rename(0, name.len()), 1);
        ENGINE.with(|e| assert_eq!(e.borrow().layers[0].name, "Water & ink 水彩"));
        assert_eq!(layer_rename(0, 513), 0);
        assert_eq!(layer_rename(0, 0), 0);
        NAME_INPUT.with(|s| s.borrow_mut()[0] = 255);
        assert_eq!(layer_rename(0, 1), 0);
        super::super::undo();
        ENGINE.with(|e| assert_eq!(e.borrow().layers[0].name, "Layer 1"));
        super::super::redo();
        ENGINE.with(|e| assert_eq!(e.borrow().layers[0].name, "Water & ink 水彩"));
    }
}
