use crate::{
    boundary::{execute_data, id},
    snapshots::PreparationSnapshot,
};
use linefield_editor_engine::Code;
use wasm_bindgen::prelude::*;
#[wasm_bindgen(js_name=memoryFrameCaptureCanonical,unchecked_return_type="PreparationSnapshot")]
pub fn capture(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] mapping: JsValue,
) -> Result<JsValue, JsValue> {
    execute_data::<PreparationSnapshot>(|e, d| {
        match (|| e.capture_frame_canonical(id(owner)?, id(session)?, id(mapping)?))() {
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
