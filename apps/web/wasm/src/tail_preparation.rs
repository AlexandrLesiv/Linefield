use crate::{
    boundary::{execute_data, id},
    snapshots::{PreparationSnapshot, Reply},
};
use linefield_editor_engine::Code;
use wasm_bindgen::prelude::*;
#[wasm_bindgen(js_name=memoryTailDisplayPreparation,unchecked_return_type="PreparationSnapshot")]
pub fn preparation(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] mapping: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] tail: JsValue,
) -> Result<JsValue, JsValue> {
    execute_data::<PreparationSnapshot>(|e, d| {
        match (|| e.tail_display_preparation(id(owner)?, id(session)?, id(mapping)?, id(tail)?))() {
            Ok(v) => {
                *d.preparation.borrow_mut() = Some(v);
                Code::Ok
            }
            Err(c) => c,
        }
    })
}
#[wasm_bindgen(js_name=memoryTailDisplayCompletePreparation,unchecked_return_type="Reply")]
pub fn complete(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] tail: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] token: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] ordinal: JsValue,
) -> Result<JsValue, JsValue> {
    execute_data::<Reply>(|e, _| {
        (|| {
            Ok(e.complete_tail_display_preparation(
                id(owner)?,
                id(session)?,
                id(tail)?,
                id(token)?,
                id(ordinal)?,
            ))
        })()
        .unwrap_or_else(|c| c)
    })
}
