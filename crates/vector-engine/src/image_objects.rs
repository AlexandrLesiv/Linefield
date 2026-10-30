//! Typed dispatch used by shared selection and mixed-object history.
use crate::{images::TAG, regional::Address, Engine};
impl Engine {
    pub(super) fn object_valid(&self, id: usize) -> bool {
        if self.text(id).is_some() {
            true
        } else if id >= TAG {
            self.image(id).is_some()
        } else {
            id < self.strokes.len()
        }
    }
    pub(super) fn object_editable(&self, id: usize) -> bool {
        if let Some(t) = self.text(id) {
            self.text_visible(id) && !self.layers[t.layer].locked
        } else if let Some(i) = self.image(id) {
            self.image_visible(id) && !self.layers[i.layer].locked
        } else {
            self.stroke_visible(id)
                && !self.layers[self.strokes[id].layer].locked
                && !self.strokes[id].points.is_empty()
        }
    }
    pub(super) fn object_anchor(&self, id: usize) -> [Address; 2] {
        if let Some(t) = self.text(id) {
            return t.anchor;
        }
        self.image(id)
            .map_or_else(|| self.strokes[id].source_anchor, |i| i.anchor)
    }
    pub(super) fn object_transform(&self, id: usize) -> [f64; 4] {
        if let Some(t) = self.text(id) {
            return [t.basis[0], t.basis[1], t.offset[0], t.offset[1]];
        }
        let (b, o) = self.image(id).map_or_else(
            || (self.strokes[id].basis, self.strokes[id].offset),
            |i| (i.basis, i.offset),
        );
        [b[0], b[1], o[0], o[1]]
    }
    pub(super) fn object_set_transform(&mut self, id: usize, t: [f64; 4]) {
        if self.text(id).is_some() {
            let label = &mut self.texts[id - crate::texts::TAG];
            label.basis = [t[0], t[1]];
            label.offset = [t[2], t[3]];
        } else if id >= TAG {
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
        if self.text(id).is_some() {
            self.texts[id - crate::texts::TAG].visible = visible;
        } else if id >= TAG {
            self.images[id - TAG].visible = visible;
        } else {
            self.strokes[id].visible = visible;
        }
    }
}
