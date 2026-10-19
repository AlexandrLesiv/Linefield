use crate::boundary::{execute_data, id};
use crate::snapshots::{ScenePage, StrokeState};
use linefield_editor_engine::Code;
use wasm_bindgen::prelude::*;
#[wasm_bindgen(js_name = memoryStrokeState, unchecked_return_type = "StrokeState")]
pub fn stroke_state(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] scene: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] stroke: JsValue,
) -> Result<JsValue, JsValue> {
    execute_data::<StrokeState>(|engine, data| {
        match (|| engine.stroke_state(id(owner)?, id(session)?, id(scene)?, id(stroke)?))() {
            Ok((geometry, verbs, terminal)) => {
                let mut payload = data.payload.borrow_mut();
                payload.geometry = geometry;
                payload.verbs = verbs;
                payload.terminal = terminal;
                Code::Ok
            }
            Err(code) => code,
        }
    })
}
#[wasm_bindgen(js_name = memoryScene, unchecked_return_type = "ScenePage")]
pub fn scene(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] scene: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] stroke: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] geometry: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] offset: JsValue,
) -> Result<JsValue, JsValue> {
    execute_data::<ScenePage>(|engine, data| {
        match (|| {
            engine.scene_page(
                id(owner)?,
                id(session)?,
                id(scene)?,
                id(stroke)?,
                id(geometry)?,
                id(offset)?,
            )
        })() {
            Ok(page) => {
                data.payload.borrow_mut().page = page;
                Code::Ok
            }
            Err(code) => code,
        }
    })
}
