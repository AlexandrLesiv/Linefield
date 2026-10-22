use crate::{
    boundary::{execute_data, id},
    snapshots::{PlacementSnapshot, PreparationSnapshot, Reply},
};
use linefield_editor_engine::Code;
use wasm_bindgen::prelude::*;
#[wasm_bindgen(js_name=memoryFrameCapture,unchecked_return_type="PreparationSnapshot")]
pub fn capture(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] mapping: JsValue,
) -> Result<JsValue, JsValue> {
    execute_data::<PreparationSnapshot>(|e, d| {
        match (|| e.capture_frame(id(owner)?, id(session)?, id(mapping)?))() {
            Ok(frame) => {
                d.frame_id.set(frame.id);
                d.frame_content.set(frame.content);
                d.frame_mapping.set(frame.mapping);
                d.count.set(frame.through);
                Code::Ok
            }
            Err(c) => c,
        }
    })
}
#[wasm_bindgen(js_name=memoryFrameTransform,unchecked_return_type="PlacementSnapshot")]
pub fn transform(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] mapping: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] receipt: JsValue,
) -> Result<JsValue, JsValue> {
    execute_data::<PlacementSnapshot>(|e, d| {
        match (|| e.frame_transform(id(owner)?, id(session)?, id(mapping)?, id(receipt)?))() {
            Ok(value) => {
                d.placement.set(value);
                Code::Ok
            }
            Err(c) => c,
        }
    })
}
#[wasm_bindgen(js_name=memoryFrameRelease,unchecked_return_type="Reply")]
pub fn release(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] receipt: JsValue,
) -> Result<JsValue, JsValue> {
    execute_data::<Reply>(|e, _| {
        (|| Ok(e.release_frame(id(owner)?, id(session)?, id(receipt)?)))().unwrap_or_else(|c| c)
    })
}
#[wasm_bindgen(js_name=memoryFrameDisplayTransform,unchecked_return_type="PlacementSnapshot")]
pub fn display_transform(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] mapping: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] receipt: JsValue,
) -> Result<JsValue, JsValue> {
    execute_data::<PlacementSnapshot>(|e, d| {
        match (|| e.frame_display_transform(id(owner)?, id(session)?, id(mapping)?, id(receipt)?))()
        {
            Ok(value) => {
                d.placement.set(value);
                Code::Ok
            }
            Err(c) => c,
        }
    })
}
#[wasm_bindgen]
impl PreparationSnapshot {
    #[wasm_bindgen(getter,js_name=frameContent)]
    pub fn frame_content(&self) -> u64 {
        self.0.0.frame_content.get()
    }
    #[wasm_bindgen(getter,js_name=frameMapping)]
    pub fn frame_mapping(&self) -> u64 {
        self.0.0.frame_mapping.get()
    }
    #[wasm_bindgen(getter,js_name=frameId)]
    pub fn frame_id(&self) -> u64 {
        self.0.0.frame_id.get()
    }
}
