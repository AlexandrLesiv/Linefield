//! Completion-only journal; overflow is sticky and never rolls back accepted input.
use super::{
    layers::Command,
    save_delta_wire::{self as wire, SavedStroke},
    Engine, Points,
};
use std::{
    cell::RefCell,
    collections::{BTreeMap, BTreeSet},
    rc::Rc,
};
const RECORD_CAP: usize = 100_000;
pub(super) struct Batch {
    pub token: u32,
    pub base: u64,
    pub result: u64,
    pub bytes: Vec<u8>,
    pub sources: Vec<(usize, Rc<Points>)>,
}
#[derive(Default)]
pub(super) struct Journal {
    pub revision: u64,
    pub durable: u64,
    pub generation: u32,
    pub overflow: bool,
    pub batch: Option<Batch>,
    pub output: Vec<u8>,
    pub pending: Vec<u8>,
    pub operations: usize,
    pub records: usize,
    pub sources: BTreeMap<usize, Rc<Points>>,
    known: BTreeSet<usize>,
    samples: usize,
    completed: BTreeMap<usize, SavedStroke>,
    members: BTreeMap<usize, BTreeSet<usize>>,
    active: BTreeSet<usize>,
}
thread_local! { pub(super) static JOURNAL:RefCell<Journal> = RefCell::new(Journal {active:BTreeSet::from([0]), ..Journal::default()}); }
impl Journal {
    fn emit(&mut self, id: usize, active: bool, out: &mut Vec<u8>) {
        self.records += 1;
        if let Some(s) = self
            .completed
            .get(&id)
            .filter(|s| active && self.active.contains(&s.layer))
        {
            out.push(1);
            out.extend_from_slice(&s.bytes);
            if self.known.insert(s.source) {
                self.samples += s.points.len();
                if self.samples > 1_000_000 {
                    self.overflow = true;
                }
                self.sources.insert(s.source, Rc::clone(&s.points));
            }
        } else {
            out.push(2);
            wire::word(out, id);
        }
    }
    fn record(&mut self, e: &Engine, command: &Command) {
        let Some(revision) = self.revision.checked_add(1) else {
            self.overflow = true;
            return;
        };
        self.revision = revision;
        if e.strokes.len() > RECORD_CAP || e.layers.len() > 4096 {
            self.overflow = true;
        }
        if self.overflow {
            return;
        }
        let mut ids = vec![];
        let mut out = vec![];
        match command {
            Command::Stroke(id) => ids.push(*id),
            Command::Move(moves) => ids.extend(moves.iter().map(|m| m.id)),
            Command::Delete(deleted) => ids.extend(deleted),
            Command::Slice(changes) => {
                for c in changes {
                    ids.push(c.original);
                    ids.extend(&c.fragments);
                }
            }
            Command::Layer(change) => {
                let id = change.save_id();
                wire::layer(&mut out, id, &e.layers[id]);
                out.push(4);
                wire::word(&mut out, e.layer_order.len());
                for id in &e.layer_order {
                    wire::word(&mut out, *id);
                }
                let was = self.active.contains(&id);
                let now = e.layers[id].rank.is_some();
                if now {
                    self.active.insert(id);
                } else {
                    self.active.remove(&id);
                }
                if was != now {
                    let members: Vec<_> = self
                        .members
                        .get(&id)
                        .into_iter()
                        .flatten()
                        .copied()
                        .collect();
                    for member in members {
                        self.emit(member, now, &mut out);
                    }
                }
            }
        }
        for id in ids {
            let s = &e.strokes[id];
            if s.visible && !s.width.is_finite() {
                self.overflow = true;
                return;
            }
            if let Some(old) = self.completed.remove(&id) {
                self.members.entry(old.layer).or_default().remove(&id);
            }
            if s.visible {
                self.completed.insert(id, wire::stroke(id, s));
                self.members.entry(s.layer).or_default().insert(id);
            }
            self.emit(id, s.visible, &mut out);
        }
        self.operations += 1;
        if self.records > RECORD_CAP
            || self.operations > RECORD_CAP
            || self.completed.len() > RECORD_CAP
            || self.pending.len() + out.len() + 12 > 32 * 1024 * 1024
        {
            self.overflow = true;
            return;
        }
        wire::wide(&mut self.pending, revision);
        wire::word(&mut self.pending, out.len());
        self.pending.extend(out);
    }
}
pub(super) fn completed(e: &Engine, command: &Command) {
    JOURNAL.with(|j| j.borrow_mut().record(e, command));
}
pub(super) fn reset(e: &Engine, revision: u64, sources: &BTreeMap<usize, Rc<Points>>) -> bool {
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
