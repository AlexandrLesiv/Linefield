use super::*;
impl Model {
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
        if self
            .texts
            .values()
            .any(|t| !self.layers.contains_key(&t.layer) || t.before_source > self.high)
        {
            return None;
        }
        let total = self.images.len().checked_add(self.texts.len())?;
        let mut orders = BTreeSet::new();
        if self
            .images
            .values()
            .filter(|i| !i.retired)
            .any(|i| i.order >= total || !orders.insert(i.order))
            || self
                .texts
                .values()
                .any(|t| t.order >= total || !orders.insert(t.order))
        {
            return None;
        }
        self.revision = result;
        Some(())
    }
}
