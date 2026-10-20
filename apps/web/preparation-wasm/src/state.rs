use crate::result::PreparationReply;
use linefield_contour_preparation::{Preparation, Status};
use std::cell::{Cell, RefCell};
#[derive(Default)]
pub(crate) struct State {
    pub counter: u64,
    pub current: Option<(u64, Preparation)>,
}
thread_local! { pub(crate) static STATE: RefCell<State> = RefCell::new(State::default()); }
thread_local! { pub(crate) static PAGE_LIVE: Cell<bool> = const { Cell::new(false) }; }
pub(crate) fn operate(
    handle: u64,
    action: impl FnOnce(&mut Preparation) -> Status,
) -> PreparationReply {
    STATE.with(|cell| {
        let Ok(mut state) = cell.try_borrow_mut() else {
            return PreparationReply::empty(Status::Capacity, handle);
        };
        let Some((id, job)) = state.current.as_mut().filter(|v| v.0 == handle) else {
            return PreparationReply::empty(Status::Stale, handle);
        };
        let status = action(job);
        let reply = PreparationReply::new(status, *id, job);
        if status == Status::Released {
            state.current = None;
        }
        reply
    })
}
