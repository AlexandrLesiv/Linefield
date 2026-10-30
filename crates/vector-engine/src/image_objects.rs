//! Typed dispatch used by shared selection and mixed-object history.
use crate::{images::TAG, regional::Address, Engine};
impl Engine {
    pub(super) fn object_valid(&self, id: usize) -> bool {
        if id >= TAG {
            self.image(id).is_some()
        } else {
            id < self.strokes.len()
        }
    }
    pub(super) fn object_editable(&self, id: usize) -> bool {
        if let Some(i) = self.image(id) {
            self.image_visible(id) && !self.layers[i.layer].locked
        } else {
            self.stroke_visible(id)
                && !self.layers[self.strokes[id].layer].locked
                && !self.strokes[id].points.is_empty()
        }
    }
    pub(super) fn object_anchor(&self, id: usize) -> [Address; 2] {
        self.image(id)
            .map_or_else(|| self.strokes[id].source_anchor, |i| i.anchor)
    }
    pub(super) fn object_transform(&self, id: usize) -> [f64; 4] {
        let (b, o) = self.image(id).map_or_else(
            || (self.strokes[id].basis, self.strokes[id].offset),
            |i| (i.basis, i.offset),
        );
        [b[0], b[1], o[0], o[1]]
    }
    pub(super) fn object_set_transform(&mut self, id: usize, t: [f64; 4]) {
        if id >= TAG {
            let i = &mut self.images[id - TAG];
            i.basis = [t[0], t[1]];
            i.offset = [t[2], t[3]];
        } else {
            let s = &mut self.strokes[id];
            s.basis = [t[0], t[1]];
            s.offset = [t[2], t[3]];
        }
    }
    pub(super) fn object_set_visible(&mut self, id: usize, visible: bool) {
        if id >= TAG {
            self.images[id - TAG].visible = visible;
        } else {
            self.strokes[id].visible = visible;
        }
    }
}
