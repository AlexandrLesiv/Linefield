//! Editable labels: fixed font version, no automatic wrapping, immutable layout receipts.
use crate::{regional::Address, Engine};
use std::rc::Rc;
pub const TAG: usize = 0x4000_0000;
pub const CAP: usize = 10_000;
pub const BYTES: usize = 16_384;
#[derive(Clone)]
pub(super) struct Text {
    pub content: Rc<crate::text_content::Content>,
    pub color: u32,
    pub opacity: f64,
    pub width: f64,
    pub ink_x: f64,
    pub baseline: f64,
    pub height: f64,
    pub revision: u32,
    pub layer: usize,
    pub before_source: usize,
    pub order: usize,
    pub anchor: [Address; 2],
    pub basis: [f64; 2],
    pub offset: [f64; 2],
    pub visible: bool,
}
impl Text {
    pub fn valid(&self) -> bool {
        !self.content.trim().is_empty()
            && self.content.split('\n').count() <= 256
            && self.content.len() <= BYTES
            && !self.content.contains('\0')
            && self.revision > 0
            && self.before_source <= 100_000
            && self.color <= 0xffffff
            && self.opacity.is_finite()
            && (0.0..=1.0).contains(&self.opacity)
            && [self.width, self.height]
                .iter()
                .all(|x| x.is_finite() && *x > 0.0 && *x <= 65536.0)
            && [self.ink_x, self.baseline]
                .iter()
                .all(|n| n.is_finite() && (0.0..=65536.0).contains(n))
            && self
                .basis
                .iter()
                .chain(self.offset.iter())
                .all(|x| x.is_finite())
            && (1e-9..=1000.0).contains(&self.basis[0].hypot(self.basis[1]))
            && (0..2).all(|a| {
                Address::normalized(self.anchor[a].region, self.anchor[a].local).is_some()
                    && Address::normalized(
                        self.anchor[a].region,
                        self.anchor[a].local + self.offset[a],
                    )
                    .is_some()
            })
    }
    pub fn corners(&self, origin: [Address; 2]) -> [[f64; 2]; 4] {
        let x = self.anchor[0].relative_to(origin[0]) + self.offset[0];
        let y = self.anchor[1].relative_to(origin[1]) + self.offset[1];
        let [a, b] = self.basis;
        [
            [0.0, 0.0],
            [self.width, 0.0],
            [self.width, self.height],
            [0.0, self.height],
        ]
        .map(|[u, v]| [x + a * u - b * v, y + b * u + a * v])
    }
}
impl Engine {
    pub(super) fn text(&self, id: usize) -> Option<&Text> {
        id.checked_sub(TAG).and_then(|i| self.texts.get(i))
    }
    pub(super) fn text_visible(&self, id: usize) -> bool {
        self.text(id).is_some_and(|t| {
            t.visible && self.layers[t.layer].rank.is_some() && self.layers[t.layer].visible
        })
    }
    pub(super) fn next_object_order(&self) -> usize {
        self.images.len() + self.texts.len()
    }
}
