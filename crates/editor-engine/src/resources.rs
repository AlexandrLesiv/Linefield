use crate::Engine;
#[derive(Clone, Copy, Debug, Default)]
pub struct Resources {
    pub canonical: usize,
    pub history: usize,
    pub derived: usize,
    pub overhead: usize,
}
impl Resources {
    pub fn total(self) -> usize {
        self.canonical + self.history + self.derived + self.overhead
    }
}
impl Engine {
    pub fn resources(&self) -> Resources {
        // Visible source storage is charged once, even when history references it.
        // Undone source storage is exclusively history until Redo or branch replacement.
        let history = self.document.strokes[self.document.visible..]
            .iter()
            .map(|s| s.samples.charge())
            .sum::<usize>();
        Resources {
            canonical: self.document.charge() - history,
            history,
            derived: self.pages.capacity() * size_of::<crate::scene::Descriptor>()
                + self.preparations.capacity() * size_of::<crate::preparation::Ticket>()
                + self.visibility_cache.bytes()
                + self
                    .visibility
                    .iter()
                    .flatten()
                    .map(|v| v.bytes())
                    .sum::<usize>(),
            overhead: size_of::<Self>(),
        }
    }
}
