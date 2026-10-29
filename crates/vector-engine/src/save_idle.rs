//! Bounded checkpoint preparation; no full pending-body concatenation or source collect.
use super::{save_delta::JOURNAL, Points};
use std::{cell::RefCell, collections::BTreeMap, rc::Rc};
pub(super) type Source = (usize, Rc<Points>);
pub(super) struct SourceBlock {
    pub entries: Vec<Source>,
    pub descriptors: Vec<u8>,
}
#[derive(Default)]
pub(super) struct Sources {
    pub blocks: Vec<SourceBlock>,
    pub len: usize,
}
impl Sources {
    pub fn push(&mut self, source: Source) {
        if self.len.is_multiple_of(256) {
            self.blocks.push(SourceBlock {
                entries: Vec::with_capacity(256),
                descriptors: Vec::with_capacity(2048),
            });
        }
        let block = self.blocks.last_mut().unwrap();
        block
            .descriptors
            .extend_from_slice(&(source.0 as u32).to_le_bytes());
        block
            .descriptors
            .extend_from_slice(&(source.1.len() as u32).to_le_bytes());
        block.entries.push(source);
        self.len += 1;
    }
    pub fn get(&self, index: usize) -> Option<&Source> {
        self.blocks.get(index / 256)?.entries.get(index % 256)
    }
}
pub(super) struct Batch {
    pub token: u32,
    pub base: u64,
    pub result: u64,
    pub header: [u8; 32],
    pub pending: Vec<u8>,
    pub remaining: BTreeMap<usize, Rc<Points>>,
    pub sources: Sources,
}
#[derive(Default)]
pub(super) struct State {
    pub active: Option<Batch>,
    pub retired: Option<Batch>,
    pub points: Option<Points>,
    pub output: Vec<u8>,
}
thread_local! { pub(super) static IDLE: RefCell<State> = RefCell::new(State::default()); }
pub(super) fn owned() -> bool {
    IDLE.with(|s| {
        let s = s.borrow();
        s.active.is_some() || s.retired.is_some()
    })
}
/// Bits: 1 preparing, 2 sealed, 4 retirement pending. No durability inference.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn idle_status() -> u32 {
    IDLE.with(|s| {
        let s = s.borrow();
        s.active
            .as_ref()
            .map_or(0, |b| if b.remaining.is_empty() { 2 } else { 1 })
            | if s.retired.is_some() { 4 } else { 0 }
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn idle_begin() -> u32 {
    IDLE.with(|s| {
        let mut s = s.borrow_mut();
        if s.active.is_some() {
            return 0;
        }
        JOURNAL.with(|j| {
            let mut j = j.borrow_mut();
            if j.overflow || j.batch.is_some() || j.operations == 0 {
                return 0;
            }
            let Some(token) = j.generation.checked_add(1) else {
                j.overflow = true;
                return 0;
            };
            let mut header = [0u8; 32];
            header[..4].copy_from_slice(b"LFD3");
            header[4..8].copy_from_slice(&1u32.to_le_bytes());
            header[8..16].copy_from_slice(&j.durable.to_le_bytes());
            header[16..24].copy_from_slice(&j.revision.to_le_bytes());
            header[24..28].copy_from_slice(&(j.operations as u32).to_le_bytes());
            header[28..32].copy_from_slice(&(j.sources.len() as u32).to_le_bytes());
            s.active = Some(Batch {
                token,
                base: j.durable,
                result: j.revision,
                header,
                pending: std::mem::take(&mut j.pending),
                remaining: std::mem::take(&mut j.sources),
                // Fixed small outer allocation: at most391 source blocks at the100k cap.
                sources: Sources {
                    blocks: Vec::with_capacity(391),
                    len: 0,
                },
            });
            j.operations = 0;
            j.records = 0;
            j.generation = token;
            token
        })
    })
}
/// At most64 source moves. 0 invalid, 1 pending, 2 sealed. Zero budget is invalid.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn idle_step(token: u32, budget: usize) -> u32 {
    if budget == 0 || budget > 64 || JOURNAL.with(|j| j.borrow().overflow) {
        return 0;
    }
    IDLE.with(|s| {
        let mut s = s.borrow_mut();
        let Some(b) = s.active.as_mut().filter(|b| b.token == token) else {
            return 0;
        };
        for _ in 0..budget {
            let Some(source) = b.remaining.pop_first() else {
                return 2;
            };
            b.sources.push(source);
        }
        if b.remaining.is_empty() {
            2
        } else {
            1
        }
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn idle_base(token: u32) -> u64 {
    IDLE.with(|s| {
        s.borrow()
            .active
            .as_ref()
            .filter(|b| b.token == token)
            .map_or(u64::MAX, |b| b.base)
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn idle_target(token: u32) -> u64 {
    IDLE.with(|s| {
        s.borrow()
            .active
            .as_ref()
            .filter(|b| b.token == token)
            .map_or(u64::MAX, |b| b.result)
    })
}
/// Exact trusted-host receipt only. Busy retirement leaves this batch retained.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn idle_ack(token: u32, base: u64, result: u64) -> u32 {
    IDLE.with(|s| {
        let mut s = s.borrow_mut();
        if s.retired.is_some()
            || !s.active.as_ref().is_some_and(|b| {
                b.token == token && b.base == base && b.result == result && b.remaining.is_empty()
            })
        {
            return 0;
        }
        JOURNAL.with(|j| {
            let mut j = j.borrow_mut();
            if j.overflow {
                return 0;
            }
            j.durable = result;
            s.retired = s.active.take();
            1
        })
    })
}
