use crate::snapshots::CurrentCoverageSnapshot;
use wasm_bindgen::prelude::*;
#[wasm_bindgen]
impl CurrentCoverageSnapshot {
    #[wasm_bindgen(getter,js_name=completedCount)]
    pub fn completed_count(&self) -> u64 {
        self.0.0.coverage.get().completed_count
    }
    #[wasm_bindgen(getter,js_name=completedThrough)]
    pub fn completed_through(&self) -> u64 {
        self.0.0.coverage.get().completed_through
    }
    #[wasm_bindgen(getter,js_name=completedContent)]
    pub fn completed_content(&self) -> u64 {
        self.0.0.coverage.get().completed_content
    }
    #[wasm_bindgen(getter,js_name=activeSource)]
    pub fn active_source(&self) -> u64 {
        self.0.0.coverage.get().active_source
    }
    #[wasm_bindgen(getter,js_name=activeCount)]
    pub fn active_count(&self) -> u64 {
        self.0.0.coverage.get().active_count
    }
    #[wasm_bindgen(getter,js_name=viewGestureActive)]
    pub fn view_gesture_active(&self) -> bool {
        self.0.0.coverage.get().view_gesture_active
    }
    #[wasm_bindgen(getter,js_name=canFold)]
    pub fn can_fold(&self) -> bool {
        self.0.0.coverage.get().can_fold
    }
    #[wasm_bindgen(getter,js_name=liveSource)]
    pub fn live_source(&self) -> u64 {
        self.0.0.coverage.get().live_source
    }
    #[wasm_bindgen(getter,js_name=liveCount)]
    pub fn live_count(&self) -> u64 {
        self.0.0.coverage.get().live_count
    }
    #[wasm_bindgen(getter,js_name=installedValid)]
    pub fn installed_valid(&self) -> bool {
        self.0.0.coverage.get().installed_valid
    }
    #[wasm_bindgen(getter,js_name=candidateValid)]
    pub fn candidate_valid(&self) -> bool {
        self.0.0.coverage.get().candidate_valid
    }
    #[wasm_bindgen(getter,js_name=candidateCount)]
    pub fn candidate_count(&self) -> u64 {
        self.0.0.coverage.get().candidate_count
    }
    #[wasm_bindgen(getter,js_name=candidateThrough)]
    pub fn candidate_through(&self) -> u64 {
        self.0.0.coverage.get().candidate_through
    }
    #[wasm_bindgen(getter,js_name=nextSource)]
    pub fn next_source(&self) -> u64 {
        self.0.0.coverage.get().next_source
    }
    #[wasm_bindgen(getter,js_name=nextCount)]
    pub fn next_count(&self) -> u64 {
        self.0.0.coverage.get().next_count
    }
    #[wasm_bindgen(getter,js_name=candidateAtCutoff)]
    pub fn candidate_at_cutoff(&self) -> bool {
        self.0.0.coverage.get().candidate_at_cutoff
    }
    #[wasm_bindgen(getter,js_name=candidateContentCurrent)]
    pub fn candidate_content_current(&self) -> bool {
        self.0.0.coverage.get().candidate_content_current
    }
    #[wasm_bindgen(getter,js_name=candidateViewCurrent)]
    pub fn candidate_view_current(&self) -> bool {
        self.0.0.coverage.get().candidate_view_current
    }
    #[wasm_bindgen(getter,js_name=candidateMappingCurrent)]
    pub fn candidate_mapping_current(&self) -> bool {
        self.0.0.coverage.get().candidate_mapping_current
    }
    #[wasm_bindgen(getter,js_name=candidateRecaptureSafe)]
    pub fn candidate_recapture_safe(&self) -> bool {
        self.0.0.coverage.get().candidate_recapture_safe
    }
    #[wasm_bindgen(getter,js_name=candidateExactView)]
    pub fn candidate_exact_view(&self) -> bool {
        self.0.0.coverage.get().candidate_exact_view
    }
    #[wasm_bindgen(getter,js_name=candidateIncludesLive)]
    pub fn candidate_includes_live(&self) -> bool {
        self.0.0.coverage.get().candidate_includes_live
    }
    #[wasm_bindgen(getter,js_name=liveState,unchecked_return_type="LiveCoverageState")]
    pub fn live_state(&self) -> JsValue {
        JsValue::from_str(self.0.0.coverage.get().live_state.label())
    }
}
