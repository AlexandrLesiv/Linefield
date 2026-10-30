//! Final engine construction from validated replay.
use super::{layers::Layer, save_decode as decode, save_replay_model::Model, Engine};
impl Model {
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
        e.strokes.try_reserve(self.high).ok()?;
        for id in 0..self.high {
            let stroke = if let Some(s) = self.strokes.get(&id) {
                s.clone()
            } else {
                decode::empty_stroke(id, e.active_layer)
            };
            e.strokes.push(stroke);
        }
        for (id,image) in &self.images {
            if *id != e.images.len() { return None; }
            e.images.push(image.clone());
        }
        if !e.image_budget(None,None,None) { return None; }
        e.refresh_blend_groups();
        Some(e)
    }
}
