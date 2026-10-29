use super::{
    layers::Layer,
    save_decode::{self as decode, Read},
    Engine, Points, Stroke,
};
use std::{
    collections::{BTreeMap, BTreeSet},
    rc::Rc,
};
#[derive(Clone)]
pub(super) struct Model {
    #[cfg(feature = "save-app")]
    settings: [u32; 2],
    pub revision: u64,
    pub sources: BTreeMap<usize, Rc<Points>>,
    strokes: BTreeMap<usize, Stroke>,
    layers: BTreeMap<usize, Layer>,
    order: Vec<usize>,
    high: usize,
}
impl Default for Model {
    fn default() -> Self {
        Self {
            #[cfg(feature = "save-app")]
            settings: [1, 0],
            revision: 0,
            sources: BTreeMap::new(),
            strokes: BTreeMap::new(),
            layers: BTreeMap::from([(0, Layer::new("Layer 1".into()))]),
            order: vec![0],
            high: 0,
        }
    }
}
impl Model {
    pub fn apply(
        &self,
        streams: &[Vec<u8>],
        expected_base: u64,
        expected_result: u64,
    ) -> Option<Self> {
        let mut r = Read {
            bytes: streams.first()?,
            at: 0,
        };
        if expected_base != self.revision
            || r.take(4)? != b"LFD3"
            || r.word()? != 1
            || r.wide()? != expected_base
        {
            return None;
        }
        let result = r.wide()?;
        if result != expected_result {
            return None;
        }
        let operations = r.word()?;
        let source_count = r.word()?;
        if operations == 0
            || operations > 100_000
            || self.revision.checked_add(operations as u64)? != result
            || source_count + 1 != streams.len()
        {
            return None;
        }
        let mut next = self.clone();
        let mut samples: usize = next.sources.values().map(|p| p.len()).sum();
        for stream in 1..=source_count {
            let id = r.word()?;
            let count = r.word()?;
            samples = samples.checked_add(count)?;
            if id >= 100_000 || samples > 1_000_000 || next.sources.contains_key(&id) {
                return None;
            }
            next.high = next.high.max(id + 1);
            next.sources
                .insert(id, decode::points(&streams[stream], count)?);
        }
        for index in 0..operations {
            if r.wide()? != self.revision + index as u64 + 1 {
                return None;
            }
            let size = r.word()?;
            let mut body = Read {
                bytes: r.take(size)?,
                at: 0,
            };
            while body.at < body.bytes.len() {
                next.record(&mut body)?;
            }
        }
        if r.at != r.bytes.len() || next.order.is_empty() || next.order.len() > 4096 {
            return None;
        }
        let unique: BTreeSet<_> = next.order.iter().copied().collect();
        if unique.len() != next.order.len()
            || unique.iter().any(|id| !next.layers.contains_key(id))
            || next.strokes.values().any(|s| !unique.contains(&s.layer))
        {
            return None;
        }
        next.revision = result;
        Some(next)
    }
    fn record(&mut self, r: &mut Read<'_>) -> Option<()> {
        match r.byte()? {
            #[cfg(feature = "save-app")]
            5 => self.settings = super::save_settings::decode(r)?,
            1 => {
                let (id, s) = decode::stroke(r, &self.sources)?;
                self.high = self.high.max(id + 1);
                self.strokes.insert(id, s);
            }
            2 => {
                let id = r.word()?;
                if id >= 100_000 {
                    return None;
                }
                self.high = self.high.max(id + 1);
                self.strokes.remove(&id);
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
    pub fn engine(&self) -> Option<Engine> {
        let mut e = Engine::default();
        #[cfg(feature = "save-app")]
        {
            e.settings = self.settings;
        }
        let max = self.layers.keys().next_back().copied()?;
        e.layers = (0..=max)
            .map(|id| {
                self.layers.get(&id).cloned().unwrap_or(Layer {
                    rank: None,
                    ..Layer::new("".into())
                })
            })
            .collect();
        for layer in &mut e.layers {
            layer.rank = None;
        }
        e.layer_order = self.order.clone();
        for (rank, id) in self.order.iter().enumerate() {
            e.layers[*id].rank = Some(rank);
        }
        e.active_layer = *self.order.first()?;
        // Empty invisible slots retain stable IDs without restoring Undo history.
        for id in 0..self.high {
            let stroke = if let Some(s) = self.strokes.get(&id) {
                s.clone()
            } else {
                decode::empty_stroke(id, e.active_layer)
            };
            e.strokes.push(stroke);
        }
        e.refresh_blend_groups();
        Some(e)
    }
}
