//! Canonical placed images; originals remain immutable host-owned durable assets.
use crate::{regional::Address, Engine};
use std::collections::BTreeMap;
pub const TAG: usize = 0x8000_0000;
pub const CAP: usize = 10_000;
pub const GPU_CAP: usize = 128 * 1024 * 1024;
#[derive(Clone)]
pub(super) struct Image {
    pub digest: [u8; 64],
    pub mime: u32,
    pub width: u32,
    pub height: u32,
    pub bytes: u32,
    pub layer: usize,
    pub before_source: usize,
    pub anchor: [Address; 2],
    pub basis: [f64; 2],
    pub offset: [f64; 2],
    pub opacity: f64,
    pub visible: bool,
}
pub(super) fn mip_bytes(mut w: usize, mut h: usize) -> Option<usize> {
    let mut total = 0usize;
    loop {
        total = total.checked_add(w.checked_mul(h)?.checked_mul(4)?)?;
        if w == 1 && h == 1 {
            return Some(total);
        }
        w = (w / 2).max(1);
        h = (h / 2).max(1);
    }
}
impl Image {
    pub fn same_asset(&self, other: &Self) -> bool {
        self.digest != other.digest
            || (self.mime, self.width, self.height, self.bytes)
                == (other.mime, other.width, other.height, other.bytes)
    }
    pub fn valid(&self) -> bool {
        (1..=3).contains(&self.mime)
            && self.width > 0
            && self.height > 0
            && u64::from(self.width) * u64::from(self.height) <= 16_777_216
            && (1..=16_777_216).contains(&self.bytes)
            && self
                .digest
                .iter()
                .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(b))
            && self.layer < 4096
            && self.before_source <= 100_000
            && self
                .basis
                .iter()
                .chain(self.offset.iter())
                .all(|n| n.is_finite())
            && (0.000000001..=1000.0).contains(&self.basis[0].hypot(self.basis[1]))
            && (0.0..=1.0).contains(&self.opacity)
            && (0..2).all(|a| self.anchor[a].offset(self.offset[a]).is_some())
    }
    pub fn corners(&self, origin: [Address; 2]) -> [[f64; 2]; 4] {
        let [a, b] = self.basis;
        let x = self.anchor[0].relative_to(origin[0]) + self.offset[0];
        let y = self.anchor[1].relative_to(origin[1]) + self.offset[1];
        let w = f64::from(self.width);
        let h = f64::from(self.height);
        [
            [x, y],
            [x + a * w, y + b * w],
            [x + a * w - b * h, y + b * w + a * h],
            [x - b * h, y + a * h],
        ]
    }
}
impl Engine {
    pub(super) fn image(&self, id: usize) -> Option<&Image> {
        self.images.get(id.checked_sub(TAG)?)
    }
    pub(super) fn image_visible(&self, id: usize) -> bool {
        self.image(id).is_some_and(|i| {
            i.visible
                && self
                    .layers
                    .get(i.layer)
                    .is_some_and(|l| l.visible && l.rank.is_some())
        })
    }
    pub(super) fn image_budget(
        &self,
        extra: Option<&Image>,
        layer: Option<(usize, &crate::layers::Layer)>,
        opacity: Option<(usize, f64)>,
    ) -> bool {
        let mut assets = BTreeMap::new();
        for (id, i) in self.images.iter().chain(extra).enumerate() {
            let l = layer
                .filter(|(id, _)| *id == i.layer)
                .map(|(_, l)| l)
                .or_else(|| self.layers.get(i.layer));
            let alpha = opacity
                .filter(|(handle, _)| *handle == TAG + id)
                .map_or(i.opacity, |(_, a)| a);
            if i.visible && alpha > 0.0 && l.is_some_and(|l| l.visible && l.rank.is_some()) {
                let shape = (i.width, i.height);
                if assets
                    .insert(i.digest, shape)
                    .is_some_and(|old| old != shape)
                {
                    return false;
                }
            }
        }
        assets
            .values()
            .try_fold(0usize, |n, &(w, h)| {
                n.checked_add(mip_bytes(w as usize, h as usize)?)
            })
            .is_some_and(|n| n <= GPU_CAP)
    }
}
