use crate::{
    arrays,
    identity::{PreparationIdentity, id},
    result::{PreparationReply, PreparedPage},
    state::{STATE, operate},
};
use linefield_contour_preparation::{Feed, Page, Preparation, Status};
use wasm_bindgen::prelude::*;
#[wasm_bindgen(js_name = prepareCreate)]
pub fn create(identity: &PreparationIdentity) -> PreparationReply {
    STATE.with(|cell| {
        let Ok(mut state) = cell.try_borrow_mut() else {
            return PreparationReply::empty(Status::Capacity, 0);
        };
        if state.current.is_some() {
            return PreparationReply::empty(Status::Invalid, 0);
        }
        let Some(handle) = state.counter.checked_add(1) else {
            return PreparationReply::empty(Status::Exhausted, 0);
        };
        let job = match Preparation::create(identity.0) {
            Ok(job) => job,
            Err(status) => return PreparationReply::empty(status, 0),
        };
        let reply = PreparationReply::new(Status::Accepted, handle, &job);
        state.counter = handle;
        state.current = Some((handle, job));
        reply
    })
}
#[wasm_bindgen(js_name = prepareBeginNextPrefix)]
pub fn begin_next(
    #[wasm_bindgen(unchecked_param_type = "bigint")] handle: JsValue,
    identity: &PreparationIdentity,
) -> PreparationReply {
    match id(handle) {
        Ok(handle) => operate(handle, |job| job.begin_next(identity.0)),
        Err(_) => PreparationReply::empty(Status::Invalid, 0),
    }
}
#[wasm_bindgen(js_name = prepareFeed)]
#[expect(
    clippy::too_many_arguments,
    reason = "P05-R08 Gate0 freezes this named typed ABI with checked scalar and array ingress"
)]
pub fn feed(
    #[wasm_bindgen(unchecked_param_type = "bigint")] handle: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] capture: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] source_start: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] source_end: JsValue,
    #[wasm_bindgen(unchecked_param_type = "boolean")] final_prefix: JsValue,
    #[wasm_bindgen(unchecked_param_type = "Uint8Array")] verbs: JsValue,
    #[wasm_bindgen(unchecked_param_type = "Float32Array")] points: JsValue,
    #[wasm_bindgen(unchecked_param_type = "Float32Array")] weights: JsValue,
) -> PreparationReply {
    if crate::state::PAGE_LIVE.get() {
        return PreparationReply::empty(Status::Capacity, 0);
    }
    let values = (
        id(handle),
        id(capture),
        id(source_start),
        id(source_end),
        final_prefix.as_bool(),
    );
    let (Ok(handle), Ok(capture), Ok(start), Ok(end), Some(final_prefix)) = values else {
        return PreparationReply::empty(Status::Invalid, 0);
    };
    let input = match arrays::read(verbs, points, weights) {
        Ok(input) => input,
        Err(_) => return PreparationReply::empty(Status::Invalid, handle),
    };
    operate(handle, |job| {
        job.feed(Feed {
            capture,
            start,
            end,
            final_prefix,
            verbs: &input.verbs[..input.counts[0]],
            points: &input.points[..input.counts[1]],
            weights: &input.weights[..input.counts[2]],
        })
    })
}
#[wasm_bindgen(js_name = prepareStep)]
pub fn step(#[wasm_bindgen(unchecked_param_type = "bigint")] handle: JsValue) -> PreparationReply {
    match id(handle) {
        Ok(handle) => operate(handle, Preparation::step),
        Err(_) => PreparationReply::empty(Status::Invalid, 0),
    }
}
#[wasm_bindgen(js_name = prepareDrain)]
pub fn drain(
    #[wasm_bindgen(unchecked_param_type = "bigint")] handle: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] output_cursor: JsValue,
) -> PreparedPage {
    let failed = |status, handle| PreparedPage {
        reply: PreparationReply::empty(status, handle),
        page: Page::default(),
        taken: 0,
        start: 0,
        leased: false,
    };
    let (Ok(handle), Ok(cursor)) = (id(handle), id(output_cursor)) else {
        return failed(Status::Invalid, 0);
    };
    if crate::state::PAGE_LIVE.get() {
        return failed(Status::Capacity, handle);
    }
    STATE.with(|cell| {
        let Ok(mut state) = cell.try_borrow_mut() else {
            return failed(Status::Capacity, handle);
        };
        let Some((_, job)) = state.current.as_mut().filter(|v| v.0 == handle) else {
            return failed(Status::Stale, handle);
        };
        match job.drain(cursor) {
            Ok(page) => {
                crate::state::PAGE_LIVE.set(true);
                PreparedPage {
                    reply: PreparationReply::new(job.status(), handle, job),
                    page,
                    taken: 0,
                    start: cursor,
                    leased: true,
                }
            }
            Err(status) => failed(status, handle),
        }
    })
}
#[wasm_bindgen(js_name = prepareRelease)]
pub fn release(
    #[wasm_bindgen(unchecked_param_type = "bigint")] handle: JsValue,
) -> PreparationReply {
    let Ok(handle) = id(handle) else {
        return PreparationReply::empty(Status::Invalid, 0);
    };
    STATE.with(|cell| {
        let Ok(mut state) = cell.try_borrow_mut() else {
            return PreparationReply::empty(Status::Capacity, handle);
        };
        let Some((_, job)) = state.current.as_mut().filter(|v| v.0 == handle) else {
            return PreparationReply::empty(
                if handle != 0 && handle <= state.counter {
                    Status::Released
                } else {
                    Status::Stale
                },
                handle,
            );
        };
        let status = job.release();
        let reply = PreparationReply::new(status, handle, job);
        if status == Status::Released {
            state.current = None;
        }
        reply
    })
}
