use super::{layers::Command, Engine, ENGINE};

/// Positions are document metadata. Canonical points, pressure and curve inputs
/// stay in stroke-local space, including during preview and history traversal.
pub(super) struct Translation {
    pub id: usize,
    pub before: [f64; 4],
    pub after: [f64; 4],
}
impl Engine {
    fn begin_delete(&mut self) {
        self.cancel();
    }
    fn add_delete(&mut self, id: usize) {
        if self.stroke_visible(id)
            && !self.layers[self.strokes[id].layer].locked
            && !self.strokes[id].points.is_empty()
        {
            self.deleting.push(id);
        }
    }
    fn commit_delete(&mut self) -> usize {
        let mut ids = std::mem::take(&mut self.deleting);
        ids.sort_unstable();
        ids.dedup();
        // Recheck protection at commit in case a layer changed during collection.
        ids.retain(|&id| {
            self.stroke_visible(id)
                && !self.layers[self.strokes[id].layer].locked
                && !self.strokes[id].points.is_empty()
        });
        let count = ids.len();
        if count != 0 {
            let command = Command::Delete(ids);
            self.apply(&command, true);
            self.record(command);
        }
        count
    }
    pub(super) fn apply_translations(&mut self, changes: &[Translation], forward: bool) {
        for change in changes {
            let t = if forward { change.after } else { change.before };
            self.strokes[change.id].basis = [t[0], t[1]];
            self.strokes[change.id].offset = [t[2], t[3]];
        }
        self.refresh_blend_groups();
        self.transform_revision = self.transform_revision.wrapping_add(1);
    }
    pub(super) fn cancel_move(&mut self) {
        let changes = std::mem::take(&mut self.moving);
        if changes.iter().any(|c| c.before != c.after) {
            self.apply_translations(&changes, false);
        }
    }
    fn begin_move(&mut self) {
        self.cancel_move();
        self.commit();
    }
    fn add_move(&mut self, id: usize) -> bool {
        if !self.stroke_visible(id)
            || self.layers[self.strokes[id].layer].locked
            || self.strokes[id].points.is_empty()
            || self.moving.iter().any(|c| c.id == id)
        {
            return false;
        }
        let s = &self.strokes[id];
        let before = [s.basis[0], s.basis[1], s.offset[0], s.offset[1]];
        self.moving.push(Translation {
            id,
            before,
            after: before,
        });
        true
    }
    fn update_move(&mut self, dx: f64, dy: f64) -> bool {
        self.update_transform(0.0, 0.0, 1.0, 0.0, dx, dy)
    }
    fn update_transform(
        &mut self,
        px: f64,
        py: f64,
        scale: f64,
        angle: f64,
        dx: f64,
        dy: f64,
    ) -> bool {
        self.update_transform_at(px, py, scale, angle, dx, dy, None)
    }
    fn update_transform_at(
        &mut self,
        px: f64, py: f64, scale: f64, angle: f64, dx: f64, dy: f64,
        pivot: Option<[super::regional::Address; 2]>,
    ) -> bool {
        if self.moving.is_empty()
            || ![px, py, scale, angle, dx, dy].iter().all(|v| v.is_finite())
            || scale <= 0.0
        {
            return false;
        }
        let (sin, cos) = angle.sin_cos();
        let a = scale * cos;
        let b = scale * sin;
        // Compose against the gesture snapshot, never against the previous preview.
        let compose = |anchor: [super::regional::Address; 2], t: [f64; 4]| {
            // Translation stays relative even at addresses beyond f64 integer precision.
            if scale == 1.0 && angle == 0.0 {
                return [t[0], t[1], t[2] + dx, t[3] + dy];
            }
            let [px, py] = pivot.map_or_else(
                || [px - anchor[0].legacy_f64(), py - anchor[1].legacy_f64()],
                |p| [p[0].relative_to(anchor[0]), p[1].relative_to(anchor[1])],
            );
            [
                a * t[0] - b * t[1],
                b * t[0] + a * t[1],
                px + a * (t[2] - px) - b * (t[3] - py) + dx,
                py + b * (t[2] - px) + a * (t[3] - py) + dy,
            ]
        };
        // Validate the whole group before changing any stroke.
        if self.moving.iter().any(|c| {
            let t = compose(self.strokes[c.id].source_anchor, c.before);
            let size = t[0].hypot(t[1]);
            !self.stroke_visible(c.id)
                || self.layers[self.strokes[c.id].layer].locked
                || !t.iter().all(|v| v.is_finite())
                || !(0.001..=1000.0).contains(&size)
                || t[2].abs() > 1.0e9
                || self.strokes[c.id].source_anchor[0].offset(t[2]).is_none()
                || t[3].abs() > 1.0e9
                || self.strokes[c.id].source_anchor[1].offset(t[3]).is_none()
        }) {
            return false;
        }
        let mut changed = false;
        for c in &mut self.moving {
            let s = &mut self.strokes[c.id];
            c.after = compose(s.source_anchor, c.before);
            changed |= [s.basis[0], s.basis[1], s.offset[0], s.offset[1]] != c.after;
            s.basis = [c.after[0], c.after[1]];
            s.offset = [c.after[2], c.after[3]];
        }
        if changed {
            self.refresh_blend_groups();
            self.transform_revision = self.transform_revision.wrapping_add(1);
        }
        true
    }
    fn commit_move(&mut self) {
        let changes: Vec<_> = std::mem::take(&mut self.moving)
            .into_iter()
            .filter(|c| c.before != c.after)
            .collect();
        if !changes.is_empty() {
            self.record(Command::Move(changes));
        }
    }
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn stroke_offset(id: usize, axis: usize) -> f64 {
    ENGINE.with(|e| {
        e.borrow()
            .strokes
            .get(id)
            .filter(|_| axis < 2)
            .map(|s| s.legacy_offset(axis))
            .unwrap_or(0.0)
    })
}
/// Similarity transform: [a, b, tx, ty], mapping (x,y) to
/// (a*x-b*y+tx, b*x+a*y+ty). Radii scale by hypot(a,b).
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn stroke_transform(id: usize, component: usize) -> f64 {
    stroke_transform_relative(id, component, 0, 0)
}
/// Disposable projection relative to a regional render origin. Subtract integer
/// regions before conversion; never subtract two flattened absolute positions.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn stroke_transform_relative(id: usize, component: usize, rx: i64, ry: i64) -> f64 {
    ENGINE.with(|e| {
        let e = e.borrow();
        let Some(s) = e.strokes.get(id) else { return if component == 0 { 1.0 } else { 0.0 }; };
        match component {
            0 | 1 => s.basis[component],
            2 | 3 => {
                let axis = component - 2;
                let origin = super::regional::Address { region: [rx, ry][axis], local: 0.0 };
                s.source_anchor[axis].relative_to(origin) + s.offset[axis]
            }
            _ => 0.0,
        }
    })
}

#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn transform_update(
    px: f64,
    py: f64,
    scale: f64,
    angle: f64,
    dx: f64,
    dy: f64,
) -> u32 {
    ENGINE.with(|e| {
        e.borrow_mut()
            .update_transform(px, py, scale, angle, dx, dy) as u32
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn transform_revision() -> u32 {
    ENGINE.with(|e| e.borrow().transform_revision)
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn move_begin() {
    ENGINE.with(|e| e.borrow_mut().begin_move());
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn move_add(id: usize) -> u32 {
    ENGINE.with(|e| e.borrow_mut().add_move(id) as u32)
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn move_update(dx: f64, dy: f64) -> u32 {
    ENGINE.with(|e| e.borrow_mut().update_move(dx, dy) as u32)
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn move_commit() {
    ENGINE.with(|e| e.borrow_mut().commit_move());
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn move_cancel() {
    ENGINE.with(|e| e.borrow_mut().cancel_move());
}

#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn delete_begin() {
    ENGINE.with(|e| e.borrow_mut().begin_delete());
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn delete_add(id: usize) {
    ENGINE.with(|e| e.borrow_mut().add_delete(id));
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn delete_commit() -> usize {
    ENGINE.with(|e| e.borrow_mut().commit_delete())
}

#[cfg(test)]
mod tests {
    use super::*;
    fn ink(e: &mut Engine) -> usize {
        let id = e.begin(12.0, 0x123456);
        for i in 0..300 {
            e.push(i as f32, (i as f32 * 0.1).sin(), (i % 7) as f32 / 6.0);
        }
        e.commit();
        id
    }
    fn raw(e: &Engine, id: usize) -> Vec<[u64; 5]> {
        (0..e.strokes[id].points.len())
            .map(|i| {
                let p = e.strokes[id].points[i];
                p.canonical_bits()
            })
            .collect()
    }
    #[test]
    fn deletion_is_one_history_step_and_preserves_transformed_raw_ink() {
        let mut e = Engine::default();
        let a = ink(&mut e);
        let b = ink(&mut e);
        let untouched = ink(&mut e);
        e.strokes[a].opacity = 0.375;
        e.begin_move();
        e.add_move(a);
        e.update_transform(10.0, 20.0, 2.0, 0.7, 6.0, 8.0);
        e.commit_move();
        let samples = [raw(&e, a), raw(&e, b)];
        let transform = (e.strokes[a].basis, e.strokes[a].offset);
        let history = e.undo.len();
        e.begin_delete();
        for id in [b, a, b, usize::MAX] {
            e.add_delete(id);
        }
        assert_eq!(e.commit_delete(), 2);
        assert_eq!(e.undo.len(), history + 1);
        assert!(!e.stroke_visible(a) && !e.stroke_visible(b));
        assert!(e.stroke_visible(untouched));
        for _ in 0..3 {
            e.undo();
            assert!(e.stroke_visible(a) && e.stroke_visible(b));
            assert_eq!((e.strokes[a].basis, e.strokes[a].offset), transform);
            assert_eq!(e.strokes[a].opacity, 0.375);
            e.redo();
            assert!(!e.stroke_visible(a) && !e.stroke_visible(b));
        }
        assert_eq!([raw(&e, a), raw(&e, b)], samples);
    }
    #[test]
    fn deletion_rechecks_protection_and_noops_preserve_redo() {
        let mut e = Engine::default();
        let a = ink(&mut e);
        let b = ink(&mut e);
        e.undo();
        let history = e.undo.len();
        e.begin_delete();
        e.add_delete(a);
        e.layers[0].locked = true;
        assert_eq!(e.commit_delete(), 0);
        e.begin_delete();
        for id in [a, b, usize::MAX] {
            e.add_delete(id);
        }
        assert_eq!(e.commit_delete(), 0);
        e.layers[0].locked = false;
        e.layers[0].visible = false;
        e.begin_delete();
        e.add_delete(a);
        assert_eq!(e.commit_delete(), 0);
        e.layers[0].visible = true;
        assert_eq!(e.undo.len(), history);
        assert_eq!(e.redo.len(), 1);
        e.redo();
        assert!(e.stroke_visible(a) && e.stroke_visible(b));
    }
    #[test]
    fn deleting_during_a_move_rolls_back_preview_and_cancel_discards_pending_ids() {
        let mut e = Engine::default();
        let a = ink(&mut e);
        let samples = raw(&e, a);
        let history = e.undo.len();
        e.begin_move();
        e.add_move(a);
        e.update_move(80.0, 30.0);
        e.begin_delete();
        assert_eq!(e.strokes[a].offset, [0.0, 0.0]);
        e.add_delete(a);
        e.cancel();
        assert_eq!(e.commit_delete(), 0);
        assert!(e.stroke_visible(a));
        assert_eq!(e.undo.len(), history);
        e.begin_delete();
        e.add_delete(a);
        assert_eq!(e.commit_delete(), 1);
        e.undo();
        assert_eq!(e.strokes[a].offset, [0.0, 0.0]);
        assert_eq!(raw(&e, a), samples);
    }
    #[test]
    fn abandoning_deletion_redo_keeps_restored_samples() {
        let mut e = Engine::default();
        let a = ink(&mut e);
        let samples = raw(&e, a);
        e.begin_delete();
        e.add_delete(a);
        e.commit_delete();
        e.undo();
        let b = ink(&mut e);
        assert!(e.redo.is_empty());
        assert!(e.stroke_visible(a) && e.stroke_visible(b));
        assert_eq!(raw(&e, a), samples);
        e.undo();
        e.undo();
        e.redo();
        assert_eq!(raw(&e, a), samples);
        assert!(e.stroke_visible(a));
    }
    #[test]
    fn grouped_moves_and_history_never_rewrite_samples() {
        let mut e = Engine::default();
        let a = ink(&mut e);
        let b = ink(&mut e);
        let saved = [raw(&e, a), raw(&e, b)];
        let history = e.undo.len();
        e.begin_move();
        assert!(e.add_move(a));
        assert!(e.add_move(b));
        assert!(!e.add_move(a));
        for i in 0..80 {
            assert!(e.update_move(i as f64 / 7.0, -i as f64 / 3.0));
        }
        e.commit_move();
        assert_eq!(e.undo.len(), history + 1);
        let moved = e.strokes[a].offset;
        assert_eq!(moved, e.strokes[b].offset);
        e.undo();
        assert_eq!(e.strokes[a].offset, [0.0; 2]);
        assert_eq!(e.strokes[b].offset, [0.0; 2]);
        e.redo();
        assert_eq!(e.strokes[a].offset, moved);
        assert_eq!([raw(&e, a), raw(&e, b)], saved);
        // A new move after undo abandons only offsets, never the original ink.
        e.undo();
        e.begin_move();
        e.add_move(a);
        e.update_move(10.0, 20.0);
        e.commit_move();
        assert!(e.redo.is_empty());
        assert_eq!([raw(&e, a), raw(&e, b)], saved);
    }
    #[test]
    fn rotation_and_resize_compose_as_group_metadata() {
        let mut e = Engine::default();
        let a = ink(&mut e);
        let b = ink(&mut e);
        let saved = [raw(&e, a), raw(&e, b)];
        e.begin_move();
        e.add_move(b);
        e.update_move(20.0, 30.0);
        e.commit_move();
        let history = e.undo.len();
        e.begin_move();
        e.add_move(a);
        e.add_move(b);
        for i in 1..=100 {
            assert!(e.update_transform(
                10.0,
                20.0,
                1.0 + i as f64 / 100.0,
                std::f64::consts::FRAC_PI_2,
                0.0,
                0.0
            ));
        }
        for (id, expected) in [(a, [50.0, 0.0]), (b, [-10.0, 40.0])] {
            assert!((e.strokes[id].basis[0]).abs() < 1e-12);
            assert!((e.strokes[id].basis[1] - 2.0).abs() < 1e-12);
            for (value, target) in e.strokes[id].offset.iter().zip(expected) {
                assert!((value - target).abs() < 1e-12);
            }
        }
        e.commit_move();
        assert_eq!(e.undo.len(), history + 1);
        let transformed = [e.strokes[a].offset, e.strokes[b].offset];
        e.undo();
        assert_eq!(e.strokes[a].basis, [1.0, 0.0]);
        assert_eq!(e.strokes[a].offset, [0.0, 0.0]);
        assert_eq!(e.strokes[b].offset, [20.0, 30.0]);
        e.redo();
        assert_eq!([e.strokes[a].offset, e.strokes[b].offset], transformed);
        e.begin_move();
        e.add_move(a);
        e.add_move(b);
        e.update_move(7.0, -9.0);
        e.commit_move();
        assert!((e.strokes[a].basis[1] - 2.0).abs() < 1e-12);
        e.undo();
        assert_eq!([e.strokes[a].offset, e.strokes[b].offset], transformed);
        assert_eq!([raw(&e, a), raw(&e, b)], saved);
    }
    #[test]
    fn transform_validation_is_atomic_and_cancel_restores_basis_and_offsets() {
        let mut e = Engine::default();
        let a = ink(&mut e);
        let b = ink(&mut e);
        let history = e.undo.len();
        e.begin_move();
        e.add_move(a);
        e.update_transform(0.0, 0.0, 10.0, 0.7, 0.0, 0.0);
        e.commit_move();
        let before = [
            e.strokes[a].basis[0],
            e.strokes[a].basis[1],
            e.strokes[a].offset[0],
            e.strokes[a].offset[1],
        ];
        e.begin_move();
        e.add_move(a);
        e.add_move(b);
        for scale in [0.0, -1.0, 1e9, f64::NAN] {
            assert!(!e.update_transform(0.0, 0.0, scale, 0.0, 0.0, 0.0));
        }
        assert!(!e.update_transform(0.0, 0.0, 1.0, f64::INFINITY, 0.0, 0.0));
        assert_eq!(e.strokes[b].basis, [1.0, 0.0]);
        assert!(e.update_transform(25.0, 15.0, 0.5, -1.2, 0.0, 0.0));
        e.cancel_move();
        assert_eq!(
            [
                e.strokes[a].basis[0],
                e.strokes[a].basis[1],
                e.strokes[a].offset[0],
                e.strokes[a].offset[1]
            ],
            before
        );
        assert_eq!(e.strokes[b].basis, [1.0, 0.0]);
        assert_eq!(e.strokes[b].offset, [0.0, 0.0]);
        assert_eq!(e.undo.len(), history + 1);
        e.undo();
        let redo = e.redo.len();
        e.begin_move();
        e.add_move(a);
        e.update_transform(0.0, 0.0, 1.0, 0.0, 0.0, 0.0);
        e.commit_move();
        assert_eq!(e.redo.len(), redo);
    }
    #[test]
    fn cancel_noop_and_invalid_moves_preserve_history() {
        let mut e = Engine::default();
        let a = ink(&mut e);
        let history = e.undo.len();
        e.begin_move();
        assert!(!e.add_move(999));
        e.add_move(a);
        assert!(!e.update_move(f64::NAN, 0.0));
        assert!(!e.update_move(0.0, f64::INFINITY));
        assert!(!e.update_move(1.0e30, 0.0));
        e.update_move(23.0, 17.0);
        e.cancel();
        assert_eq!(e.strokes[a].offset, [0.0; 2]);
        assert_eq!(e.undo.len(), history);
        e.begin_move();
        e.add_move(a);
        e.update_move(23.0, 17.0);
        e.update_move(0.0, 0.0);
        e.commit_move();
        assert_eq!(e.undo.len(), history);
        e.layers[0].locked = true;
        assert!(!e.add_move(a));
        e.layers[0].locked = false;
        e.layers[0].visible = false;
        assert!(!e.add_move(a));
    }
}

/// Canonical placement transport; invalid ids/axes return zero, as scalar accessors do.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn stroke_placement_region(id: usize, axis: usize) -> i64 {
    ENGINE.with(|e| e.borrow().strokes.get(id).and_then(|s| s.placement(axis)).map_or(0, |p| p.region))
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn stroke_placement_local(id: usize, axis: usize) -> f64 {
    ENGINE.with(|e| e.borrow().strokes.get(id).and_then(|s| s.placement(axis)).map_or(0.0, |p| p.local))
}

/// Regional pivot stays precise before composition; validation is atomic for the group.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn transform_update_regional(
    rx: i64, x: f64, ry: i64, y: f64, scale: f64, angle: f64, dx: f64, dy: f64,
) -> u32 {
    let Some(x) = super::regional::Address::normalized(rx, x) else { return 0; };
    let Some(y) = super::regional::Address::normalized(ry, y) else { return 0; };
    ENGINE.with(|e| e.borrow_mut().update_transform_at(0.0, 0.0, scale, angle, dx, dy, Some([x, y])) as u32)
}
