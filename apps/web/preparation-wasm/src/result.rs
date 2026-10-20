use linefield_contour_preparation::{Page, Preparation, Status};
use wasm_bindgen::prelude::*;
#[wasm_bindgen]
pub struct PreparationReply {
    #[wasm_bindgen(readonly, getter_with_clone)]
    pub status: String,
    #[wasm_bindgen(readonly)]
    pub handle: u64,
    #[wasm_bindgen(readonly)]
    pub capture: u64,
    #[wasm_bindgen(readonly)]
    pub source_cursor: u64,
    #[wasm_bindgen(readonly)]
    pub output_cursor: u64,
    #[wasm_bindgen(readonly)]
    pub output_generation: u64,
    #[wasm_bindgen(readonly)]
    pub original: u64,
    #[wasm_bindgen(readonly)]
    pub retained: u64,
    #[wasm_bindgen(readonly)]
    pub duplicates: u64,
    #[wasm_bindgen(readonly)]
    pub covered: u64,
    #[wasm_bindgen(readonly)]
    pub predicates: u64,
    #[wasm_bindgen(readonly)]
    pub visits: u64,
    #[wasm_bindgen(readonly)]
    pub comparisons: u64,
    #[wasm_bindgen(readonly)]
    pub budget_keeps: u64,
    #[wasm_bindgen(readonly)]
    pub index_bytes: usize,
    #[wasm_bindgen(readonly)]
    pub required_bytes: usize,
}
impl PreparationReply {
    pub fn empty(status: Status, handle: u64) -> Self {
        Self {
            status: status.label().into(),
            handle,
            capture: 0,
            source_cursor: 0,
            output_cursor: 0,
            output_generation: 0,
            original: 0,
            retained: 0,
            duplicates: 0,
            covered: 0,
            predicates: 0,
            visits: 0,
            comparisons: 0,
            budget_keeps: 0,
            index_bytes: 0,
            required_bytes: 0,
        }
    }
    pub fn new(status: Status, handle: u64, job: &Preparation) -> Self {
        let counts = job.counters();
        Self {
            status: status.label().into(),
            handle,
            capture: job.identity().capture,
            source_cursor: job.source_cursor(),
            output_cursor: job.output_cursor(),
            output_generation: job.generation(),
            original: counts.original,
            retained: counts.retained,
            duplicates: counts.duplicates,
            covered: counts.covered,
            predicates: counts.predicates,
            visits: counts.visits,
            comparisons: counts.comparisons,
            budget_keeps: counts.budget_keeps,
            index_bytes: job.bytes(),
            required_bytes: job.required_bytes(),
        }
    }
}
#[wasm_bindgen]
pub struct PreparedPage {
    pub(crate) reply: PreparationReply,
    pub(crate) page: Page,
    pub(crate) taken: u8,
    pub(crate) start: u64,
    pub(crate) leased: bool,
}
#[wasm_bindgen]
impl PreparedPage {
    #[wasm_bindgen(getter)]
    pub fn start(&self) -> u64 {
        self.start
    }
    #[wasm_bindgen(getter)]
    pub fn next(&self) -> u64 {
        self.reply.output_cursor
    }
    #[wasm_bindgen(getter)]
    pub fn source_prefix(&self) -> u64 {
        self.reply.source_cursor
    }
    #[wasm_bindgen(getter)]
    pub fn output_generation(&self) -> u64 {
        self.reply.output_generation
    }
    #[wasm_bindgen(getter)]
    pub fn done(&self) -> bool {
        self.reply.status == "complete"
    }
    pub fn metadata(&self) -> PreparationReply {
        PreparationReply {
            status: self.reply.status.clone(),
            handle: self.reply.handle,
            capture: self.reply.capture,
            source_cursor: self.reply.source_cursor,
            output_cursor: self.reply.output_cursor,
            output_generation: self.reply.output_generation,
            original: self.reply.original,
            retained: self.reply.retained,
            duplicates: self.reply.duplicates,
            covered: self.reply.covered,
            predicates: self.reply.predicates,
            visits: self.reply.visits,
            comparisons: self.reply.comparisons,
            budget_keeps: self.reply.budget_keeps,
            index_bytes: self.reply.index_bytes,
            required_bytes: self.reply.required_bytes,
        }
    }
    pub fn verbs(&mut self) -> Result<Box<[u8]>, JsValue> {
        self.take(1)?;
        Ok(std::mem::take(&mut self.page.verbs).into_boxed_slice())
    }
    pub fn points(&mut self) -> Result<Box<[f32]>, JsValue> {
        self.take(2)?;
        Ok(std::mem::take(&mut self.page.points).into_boxed_slice())
    }
    pub fn weights(&mut self) -> Result<Box<[f32]>, JsValue> {
        self.take(4)?;
        Ok(std::mem::take(&mut self.page.weights).into_boxed_slice())
    }
}
impl Drop for PreparedPage {
    fn drop(&mut self) {
        if self.leased {
            crate::state::PAGE_LIVE.set(false);
        }
    }
}
impl PreparedPage {
    fn take(&mut self, flag: u8) -> Result<(), JsValue> {
        if self.taken & flag != 0 {
            return Err(JsValue::from_str("consumed"));
        }
        self.taken |= flag;
        Ok(())
    }
}
