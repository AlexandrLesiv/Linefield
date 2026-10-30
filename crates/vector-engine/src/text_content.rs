//! Shared immutable UTF-8 payload admission includes history, replay and export owners.
use std::{cell::Cell, ops::Deref, rc::Rc};
const CAP: usize = 128 * 1024 * 1024;
thread_local! {static RETAINED:Cell<usize>=const{Cell::new(0)};}
#[derive(PartialEq)]
pub(super) struct Content(String);
impl Content {
    pub fn retained() -> usize {
        RETAINED.with(Cell::get)
    }
    pub fn new(value: &str) -> Option<Rc<Self>> {
        let next = RETAINED.with(|n| n.get().checked_add(value.len()))?;
        if next > CAP {
            return None;
        }
        let mut text = String::new();
        text.try_reserve_exact(value.len()).ok()?;
        text.push_str(value);
        RETAINED.with(|n| n.set(next));
        Some(Rc::new(Self(text)))
    }
}
impl Deref for Content {
    type Target = str;
    fn deref(&self) -> &str {
        &self.0
    }
}
impl Drop for Content {
    fn drop(&mut self) {
        let _ = RETAINED.try_with(|n| n.set(n.get().saturating_sub(self.0.len())));
    }
}
