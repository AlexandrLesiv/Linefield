use crate::boundary::{execute_data, id};
use crate::snapshots::{SceneIds, ScenePage, StrokeState};
use linefield_editor_engine::Code;
use wasm_bindgen::prelude::*;
#[wasm_bindgen(js_name = memoryRenderIds, unchecked_return_type = "SceneIds")]
pub fn render_ids(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] target: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] after: JsValue,
) -> Result<JsValue, JsValue> {
    execute_data::<SceneIds>(|engine, data| {
        match (|| engine.render_ids(id(owner)?, id(session)?, id(target)?, id(after)?))() {
            Ok((ids, done)) => {
                let mut p = data.payload.borrow_mut();
                p.ids = ids;
                p.done = done;
                Code::Ok
            }
            Err(code) => code,
        }
    })
}
#[wasm_bindgen(js_name = memoryRenderStroke, unchecked_return_type = "StrokeState")]
pub fn render_stroke(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] target: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] stroke: JsValue,
) -> Result<JsValue, JsValue> {
    execute_data::<StrokeState>(|engine, data| {
        match (|| engine.render_stroke(id(owner)?, id(session)?, id(target)?, id(stroke)?))() {
            Ok((geometry, verbs, terminal)) => {
                let mut p = data.payload.borrow_mut();
                p.geometry = geometry;
                p.verbs = verbs;
                p.terminal = terminal;
                Code::Ok
            }
            Err(code) => code,
        }
    })
}
#[wasm_bindgen(js_name = memoryRenderPage, unchecked_return_type = "ScenePage")]
pub fn render_page(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] target: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] stroke: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] geometry: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] offset: JsValue,
) -> Result<JsValue, JsValue> {
    execute_data::<ScenePage>(|engine, data| {
        match (|| {
            engine.render_page(
                id(owner)?,
                id(session)?,
                id(target)?,
                id(stroke)?,
                id(geometry)?,
                id(offset)?,
            )
        })() {
            Ok(value) => {
                data.payload.borrow_mut().page = value;
                Code::Ok
            }
            Err(code) => code,
        }
    })
}
