use crate::{
    boundary::{execute_data, id},
    snapshots::{PlacementSnapshot, PreparationSnapshot},
};
use linefield_editor_engine::Code;
use wasm_bindgen::prelude::*;
#[wasm_bindgen(js_name=memoryTailDisplayAdopt,unchecked_return_type="PreparationSnapshot")]
pub fn adopt(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] tail: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] token: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] ordinal: JsValue,
    #[wasm_bindgen(unchecked_param_type = "Float32Array")] data: JsValue,
    #[wasm_bindgen(unchecked_param_type = "Float64Array")] origin: JsValue,
) -> Result<JsValue, JsValue> {
    execute_data::<PreparationSnapshot>(|e, d| {
        match (|| {
            e.adopt_tail_display(
                id(owner)?,
                id(session)?,
                id(tail)?,
                id(token)?,
                id(ordinal)?,
                &crate::arrays::geometry(data)?,
                crate::arrays::origin(origin)?,
            )
        })() {
            Ok(v) => {
                d.count.set(v);
                Code::Ok
            }
            Err(c) => c,
        }
    })
}
#[wasm_bindgen(js_name=memoryTailDisplayPlacement,unchecked_return_type="PlacementSnapshot")]
pub fn placement(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] mapping: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] tail: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] page: JsValue,
) -> Result<JsValue, JsValue> {
    execute_data::<PlacementSnapshot>(|e, d| {
        match (|| {
            e.tail_display_placement(id(owner)?, id(session)?, id(mapping)?, id(tail)?, id(page)?)
        })() {
            Ok(v) => {
                d.placement.set(v);
                Code::Ok
            }
            Err(c) => c,
        }
    })
}
