use super::*;
pub(crate) fn reset(e: &Engine, revision: u64, sources: &BTreeMap<usize, Rc<Points>>) -> bool {
    #[cfg(feature = "save-idle")]
    if crate::save_idle::owned() {
        return false;
    }
    JOURNAL.with(|j| {
        let mut j = j.borrow_mut();
        let Some(generation) = j.generation.checked_add(1) else {
            return false;
        };
        let mut next = Journal {
            revision,
            durable: revision,
            generation,
            active: e.layer_order.iter().copied().collect(),
            known: sources.keys().copied().collect(),
            samples: sources.values().map(|p| p.len()).sum(),
            ..Journal::default()
        };
        for (id, s) in e.strokes.iter().enumerate().filter(|(_, s)| s.visible) {
            next.completed.insert(id, wire::stroke(id, s));
            next.members.entry(s.layer).or_default().insert(id);
        }
        *j = next;
        true
    })
}
