use crate::{
    boundary::{execute_data, id, number},
    snapshots::{PlacementSnapshot, PreparationSnapshot},
};
use linefield_editor_engine::Code;
use wasm_bindgen::prelude::*;
#[wasm_bindgen(js_name=memoryFrameStablePreparation,unchecked_return_type="PreparationSnapshot")]
pub fn frame_stable_preparation(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] scene: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] stroke: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] from: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] frame: JsValue,
    #[wasm_bindgen(unchecked_param_type = "number")] detail: JsValue,
) -> Result<JsValue, JsValue> {
    execute_data::<PreparationSnapshot>(|e, d| {
        match (|| {
            e.frame_stable_preparation(
                id(owner)?,
                id(session)?,
                id(scene)?,
                id(stroke)?,
                id(from)?,
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
#[wasm_bindgen(js_name=memoryFrameTailPreparation,unchecked_return_type="PreparationSnapshot")]
pub fn frame_tail_preparation(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] scene: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] stroke: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] from: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] frame: JsValue,
    #[wasm_bindgen(unchecked_param_type = "number")] detail: JsValue,
) -> Result<JsValue, JsValue> {
    execute_data::<PreparationSnapshot>(|e, d| {
        match (|| {
            e.frame_tail_preparation(
                id(owner)?,
                id(session)?,
                id(scene)?,
                id(stroke)?,
                id(from)?,
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
#[wasm_bindgen(js_name=memoryLivePlacement,unchecked_return_type="PlacementSnapshot")]
pub fn placement(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] frame: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] stroke: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] page: JsValue,
) -> Result<JsValue, JsValue> {
    execute_data::<PlacementSnapshot>(|e, d| {
        match (|| e.live_placement(id(owner)?, id(session)?, id(frame)?, id(stroke)?, id(page)?))()
        {
            Ok(p) => {
                d.placement.set(p);
                Code::Ok
            }
            Err(c) => c,
        }
    })
}
#[wasm_bindgen(js_name=memoryFrameAppend,unchecked_return_type="PreparationSnapshot")]
pub fn append(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] frame: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] stroke: JsValue,
) -> Result<JsValue, JsValue> {
    execute_data::<PreparationSnapshot>(|e, d| {
        match (|| e.append_frame(id(owner)?, id(session)?, id(frame)?, id(stroke)?))() {
            Ok(f) => {
                d.frame_id.set(f.id);
                d.frame_content.set(f.content);
                d.frame_mapping.set(f.mapping);
                d.count.set(f.through);
                Code::Ok
            }
            Err(c) => c,
        }
    })
}
