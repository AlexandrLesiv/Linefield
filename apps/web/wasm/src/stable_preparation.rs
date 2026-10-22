use crate::{
    boundary::{execute_data, id, number},
    snapshots::PreparationSnapshot,
};
use linefield_editor_engine::Code;
use wasm_bindgen::prelude::*;
#[wasm_bindgen(js_name=memoryStablePreparation,unchecked_return_type="PreparationSnapshot")]
pub fn prepare(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] scene: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] stroke: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] from: JsValue,
    #[wasm_bindgen(unchecked_param_type = "number")] detail: JsValue,
) -> Result<JsValue, JsValue> {
    execute_data::<PreparationSnapshot>(|e, d| {
        match (|| {
            e.stable_preparation(
                id(owner)?,
                id(session)?,
                id(scene)?,
                id(stroke)?,
                id(from)?,
                number(detail)?,
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
#[wasm_bindgen]
impl PreparationSnapshot {
    #[wasm_bindgen(getter)]
    pub fn through(&self) -> u64 {
        self.0
            .0
            .preparation
            .borrow()
            .as_ref()
            .map_or(0, |p| p.through)
    }
}
