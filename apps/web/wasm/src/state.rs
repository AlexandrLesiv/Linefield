use crate::snapshots::State;
use linefield_editor_engine::Phase;
use wasm_bindgen::prelude::*;
#[wasm_bindgen]
impl State {
    #[wasm_bindgen(getter, unchecked_return_type = "Phase")]
    pub fn phase(&self) -> JsValue {
        JsValue::from_str(self.0.0.value.get().phase.label())
    }
    #[wasm_bindgen(getter)]
    pub fn width(&self) -> f64 {
        self.0.0.value.get().width
    }
    #[wasm_bindgen(getter)]
    pub fn red(&self) -> f64 {
        self.0.0.value.get().color[0]
    }
    #[wasm_bindgen(getter)]
    pub fn green(&self) -> f64 {
        self.0.0.value.get().color[1]
    }
    #[wasm_bindgen(getter)]
    pub fn blue(&self) -> f64 {
        self.0.0.value.get().color[2]
    }
    #[wasm_bindgen(getter, js_name = canUndo)]
    pub fn can_undo(&self) -> bool {
        self.0.0.value.get().can_undo
    }
    #[wasm_bindgen(getter, js_name = canRedo)]
    pub fn can_redo(&self) -> bool {
        self.0.0.value.get().can_redo
    }
    #[wasm_bindgen(getter, js_name = canBeginInk)]
    pub fn can_begin_ink(&self) -> bool {
        let value = self.0.0.value.get();
        value.phase == Phase::Ready && value.presented && value.interaction == 0
    }
    #[wasm_bindgen(getter, js_name = strokeCount)]
    pub fn stroke_count(&self) -> u64 {
        self.0.0.value.get().stroke_count
    }
    #[wasm_bindgen(getter, js_name = cpuCharge)]
    pub fn cpu_charge(&self) -> f64 {
        self.0.0.value.get().cpu_charge as f64
    }
}
