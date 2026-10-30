//! Unpublished replay state. Failed sessions are discarded, never rolled back by cloning.
use super::{
    layers::Layer,
    save_decode::{self as decode, Read},
    Points, Stroke,
};
use std::{
    collections::{BTreeMap, BTreeSet},
    rc::Rc,
};
pub(super) struct Model {
    #[cfg(feature = "save-app")]
    pub settings: [u32; 2],
    pub revision: u64,
    pub sources: BTreeMap<usize, Rc<Points>>,
    pub strokes: BTreeMap<usize, Stroke>,
    pub images: BTreeMap<usize, crate::images::Image>,
    pub layers: BTreeMap<usize, Layer>,
    pub order: Vec<usize>,
    pub high: usize,
    pub samples: usize,
    pub retiring: Option<Points>,
    reserved: BTreeSet<usize>,
    members: BTreeMap<usize, usize>,
    pub source_refs: BTreeMap<usize, usize>,
    pub prune_after: Option<usize>,
}
impl Default for Model {
    fn default() -> Self {
        Self {
            #[cfg(feature = "save-app")]
            settings: [1, 0],
            revision: 0,
            sources: BTreeMap::new(),
            strokes: BTreeMap::new(),
            images: BTreeMap::new(),
            layers: BTreeMap::from([(0, Layer::new("Layer 1".into()))]),
            order: vec![0],
            high: 0,
            samples: 0,
            retiring: None,
            reserved: BTreeSet::new(),
            members: BTreeMap::new(),
            source_refs: BTreeMap::new(),
            prune_after: None,
        }
    }
}
impl Model {
    pub fn retire(&mut self, budget: usize) -> bool {
        for _ in 0..budget {
            if let Some(points) = self.retiring.as_mut() {
                if points.blocks.pop().is_none() {
                    self.retiring = None;
                }
            } else if self.images.pop_first().is_some()
                || self.strokes.pop_first().is_some()
                || self.layers.pop_first().is_some()
                || self.reserved.pop_first().is_some()
                || self.members.pop_first().is_some()
                || self.source_refs.pop_first().is_some()
            {
                continue;
            } else if let Some((_, points)) = self.sources.pop_first() {
                self.retiring = Rc::try_unwrap(points).ok();
            } else {
                return true;
            }
        }
        false
    }
    pub fn reserve_source(&mut self, id: usize) -> bool {
        self.reserved.insert(id)
    }
    pub fn add_source(&mut self, id: usize, points: Rc<Points>) -> Option<()> {
        if id >= 100_000 || self.sources.contains_key(&id) || !self.reserved.remove(&id) {
            return None;
        }
        self.samples = self.samples.checked_add(points.len())?;
        self.samples.checked_mul(40)?;
        self.high = self.high.max(id.checked_add(1)?);
        self.sources.insert(id, points);
        Some(())
    }
    pub fn finish(&mut self, result: u64) -> Option<()> {
        if self.order.is_empty() || self.order.len() > 4096 {
            return None;
        }
        let unique: BTreeSet<_> = self.order.iter().copied().collect();
        if unique.len() != self.order.len()
            || unique.iter().any(|id| !self.layers.contains_key(id))
            || self
                .members
                .iter()
                .any(|(layer, count)| *count > 0 && !unique.contains(layer))
        {
            return None;
        }
        if self.images.values().any(|i| {
            !i.retired && (!self.layers.contains_key(&i.layer) || i.before_source > self.high)
        }) {
            return None;
        }
        self.revision = result;
        Some(())
    }
    pub fn record(&mut self, r: &mut Read<'_>) -> Option<()> {
        match r.byte()? {
            8 => {
                let id = r.word()?;
                if id >= crate::images::CAP
                    || id > self.images.len()
                    || self.images.get(&id).is_some_and(|image| image.visible)
                {
                    return None;
                }
                self.images.insert(id, crate::images::Image::tombstone());
            }
            7 => {
                let (id, image) = crate::image_save::decode(r)?;
                crate::image_save::validate_update(&self.images, id, &image)?;
                self.high = self.high.max(image.before_source);
                self.images.insert(id, image);
            }
            6 => {
                let high = r.word()?;
                if high < self.high || high > 100_000 {
                    return None;
                }
                self.high = high;
            }
            #[cfg(feature = "save-app")]
            5 => self.settings = super::save_settings::decode(r)?,
            1 => {
                let (id, s) = decode::stroke(r, &self.sources)?;
                self.high = self.high.max(id + 1);
                *self.members.entry(s.layer).or_default() += 1;
                *self.source_refs.entry(s.source).or_default() += 1;
                if let Some(old) = self.strokes.get(&id) {
                    *self.members.get_mut(&old.layer)? -= 1;
                    *self.source_refs.get_mut(&old.source)? -= 1;
                }
                self.strokes.insert(id, s);
            }
            2 => {
                let id = r.word()?;
                if id >= 100_000 {
                    return None;
                }
                self.high = self.high.max(id + 1);
                if let Some(old) = self.strokes.remove(&id) {
                    *self.members.get_mut(&old.layer)? -= 1;
                    *self.source_refs.get_mut(&old.source)? -= 1;
                }
            }
            3 => {
                let id = r.word()?;
                if id >= 4096 {
                    return None;
                }
                let visible = r.boolean()?;
                let locked = r.boolean()?;
                let default_name = r.boolean()?;
                let size = r.word()?;
                if size > 512 {
                    return None;
                }
                let name = std::str::from_utf8(r.take(size)?).ok()?.to_owned();
                if name.is_empty() {
                    return None;
                }
                self.layers.insert(
                    id,
                    Layer {
                        name,
                        default_name,
                        visible,
                        locked,
                        rank: None,
                    },
                );
            }
            4 => {
                let count = r.word()?;
                if count == 0 || count > 4096 {
                    return None;
                }
                self.order = (0..count).map(|_| r.word()).collect::<Option<Vec<_>>>()?;
            }
            _ => return None,
        }
        Some(())
    }
}
