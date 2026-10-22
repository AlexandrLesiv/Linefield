use crate::{
    boundary::{execute_data, id},
    snapshots::{PreparationSnapshot, Reply},
};
use wasm_bindgen::prelude::*;
#[wasm_bindgen(js_name=memoryPreparationCoverage,unchecked_return_type="PreparationSnapshot")]
pub fn coverage(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] token: JsValue,
) -> Result<JsValue, JsValue> {
    execute_data::<PreparationSnapshot>(|e, d| {
        match (|| e.preparation_coverage(id(owner)?, id(session)?, id(token)?))() {
            Ok(covered) => {
                d.count.set(u64::from(covered));
                linefield_editor_engine::Code::Ok
            }
            Err(c) => c,
        }
    })
}
#[wasm_bindgen(js_name=memoryCompletePreparation,unchecked_return_type="Reply")]
pub fn complete(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] token: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] ordinal: JsValue,
) -> Result<JsValue, JsValue> {
    execute_data::<Reply>(|e, _| {
        (|| Ok(e.complete_preparation(id(owner)?, id(session)?, id(token)?, id(ordinal)?)))()
            .unwrap_or_else(|c| c)
    })
}
