use crate::{
    boundary::{execute_data, id},
    snapshots::Reply,
};
use wasm_bindgen::prelude::*;
#[wasm_bindgen(js_name=memoryDisplayReady,unchecked_return_type="Reply")]
pub fn ready(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] mapping: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] receipt: JsValue,
) -> Result<JsValue, JsValue> {
    execute_data::<Reply>(|e, _| {
        (|| Ok(e.display_ready(id(owner)?, id(session)?, id(mapping)?, id(receipt)?)))()
            .unwrap_or_else(|c| c)
    })
}
