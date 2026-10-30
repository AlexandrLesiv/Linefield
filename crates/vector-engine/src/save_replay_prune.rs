//! Prune only at a new editor epoch's exact durable baseline, before newer deltas.
use super::{
    save_replay::{Session, RESTORE},
    save_replay_model::Model,
};
use std::{
    ops::Bound::{Excluded, Unbounded},
    rc::Rc,
};
impl Model {
    fn prune(&mut self, budget: usize) -> bool {
        for _ in 0..budget {
            if let Some(points) = self.retiring.as_mut() {
                if points.blocks.pop().is_none() {
                    self.retiring = None;
                }
                continue;
            }
            let entry = if let Some(after) = self.prune_after {
                self.sources.range((Excluded(after), Unbounded)).next()
            } else {
                self.sources.iter().next()
            };
            let Some((&id, _)) = entry else {
                return true;
            };
            self.prune_after = Some(id);
            if self.source_refs.get(&id).copied().unwrap_or(0) == 0 {
                let points = self.sources.remove(&id).unwrap();
                self.samples -= points.len();
                self.retiring = Rc::try_unwrap(points).ok();
            }
        }
        false
    }
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn restore_prune_sources(token: u32, revision: u64, budget: usize) -> u32 {
    RESTORE.with(|s| {
        let mut s = s.borrow_mut();
        if token == 0
            || s.generation != token
            || s.failed
            || s.batch.is_some()
            || s.checkpoint.is_some()
            || budget == 0
            || budget > 64
        {
            return 0;
        }
        let Session { model, .. } = &mut *s;
        let Some(m) = model.as_mut().filter(|m| m.revision == revision) else {
            return 0;
        };
        if m.prune(budget) {
            2
        } else {
            1
        }
    })
}
