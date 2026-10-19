use crate::boundary::{execute_data, id};
use crate::snapshots::PanPreview;
use linefield_editor_engine::Code;
use wasm_bindgen::prelude::*;
#[wasm_bindgen(js_name = memoryPanPreview, unchecked_return_type = "PanPreview")]
pub fn pan_preview(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] mapping: JsValue,
) -> Result<JsValue, JsValue> {
    execute_data::<PanPreview>(|engine, data| {
        match (|| engine.pan_preview(id(owner)?, id(session)?, id(mapping)?))() {
            Ok(value) => {
                data.payload.borrow_mut().pan_preview = value;
                Code::Ok
            }
            Err(code) => code,
        }
    })
}
#[wasm_bindgen]
impl PanPreview {
    #[wasm_bindgen(getter, js_name = sourceInteraction)]
    pub fn source_interaction(&self) -> u64 {
        self.0.0.payload.borrow().pan_preview.source
    }
    #[wasm_bindgen(getter, js_name = sourceMapping)]
    pub fn source_mapping(&self) -> u64 {
        self.0.0.payload.borrow().pan_preview.mapping
    }
    #[wasm_bindgen(getter)]
    pub fn active(&self) -> bool {
        self.0.0.payload.borrow().pan_preview.active
    }
    #[wasm_bindgen(getter)]
    pub fn outside(&self) -> bool {
        self.0.0.payload.borrow().pan_preview.outside
    }
    #[wasm_bindgen(getter, js_name = offsetX)]
    pub fn offset_x(&self) -> f64 {
        self.0.0.payload.borrow().pan_preview.offset[0]
    }
    #[wasm_bindgen(getter, js_name = offsetY)]
    pub fn offset_y(&self) -> f64 {
        self.0.0.payload.borrow().pan_preview.offset[1]
    }
}
