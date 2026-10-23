use crate::{
    boundary::{execute_data, execute_query, id, number},
    snapshots::{PlacementSnapshot, PreparationSnapshot},
};
use linefield_editor_engine::Code;
use wasm_bindgen::prelude::*;
#[wasm_bindgen(js_name=memoryFramePreparation,unchecked_return_type="PreparationSnapshot")]
#[expect(
    clippy::too_many_arguments,
    reason = "MIG-C1 named immutable frame preparation"
)]
pub fn prepare(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] scene: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] stroke: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] chunk: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] revision: JsValue,
    #[wasm_bindgen(unchecked_param_type = "number")] detail: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] frame: JsValue,
) -> Result<JsValue, JsValue> {
    execute_data::<PreparationSnapshot>(|e, d| {
        match (|| {
            e.frame_preparation(
                id(owner)?,
                id(session)?,
                id(scene)?,
                id(stroke)?,
                id(chunk)?,
                id(revision)?,
                number(detail)?,
                id(frame)?,
            )
        })() {
            Ok(p) => {
                *d.preparation.borrow_mut() = Some(p);
                Code::Ok
            }
            Err(c) => c,
        }
    })
}
#[wasm_bindgen(js_name=memoryFramePreparationCoverage,unchecked_return_type="PreparationSnapshot")]
pub fn coverage(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] token: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] frame: JsValue,
) -> Result<JsValue, JsValue> {
    execute_query::<PreparationSnapshot>(|e, d| {
        match (|| e.frame_preparation_coverage(id(owner)?, id(session)?, id(token)?, id(frame)?))()
        {
            Ok(p) => {
                d.count.set(u64::from(p));
                Code::Ok
            }
            Err(c) => c,
        }
    })
}
#[wasm_bindgen(js_name=memoryFramePlacement,unchecked_return_type="PlacementSnapshot")]
pub fn placement(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] frame: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] stroke: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] page: JsValue,
) -> Result<JsValue, JsValue> {
    execute_query::<PlacementSnapshot>(|e, d| {
        match (|| e.frame_placement(id(owner)?, id(session)?, id(frame)?, id(stroke)?, id(page)?))()
        {
            Ok(p) => {
                d.placement.set(p);
                Code::Ok
            }
            Err(c) => c,
        }
    })
}
