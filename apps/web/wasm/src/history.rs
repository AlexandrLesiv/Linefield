use crate::boundary::{execute, id, number};
use crate::snapshots::Reply;
use wasm_bindgen::prelude::*;
#[wasm_bindgen(js_name = memorySettings, unchecked_return_type = "Reply")]
pub fn settings(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "number")] width: JsValue,
    #[wasm_bindgen(unchecked_param_type = "number")] red: JsValue,
    #[wasm_bindgen(unchecked_param_type = "number")] green: JsValue,
    #[wasm_bindgen(unchecked_param_type = "number")] blue: JsValue,
) -> Result<JsValue, JsValue> {
    execute::<Reply>(|engine| {
        (|| {
            Ok(engine.settings(
                id(owner)?,
                id(session)?,
                number(width)?,
                [number(red)?, number(green)?, number(blue)?],
            ))
        })()
        .unwrap_or_else(|code| code)
    })
}
#[wasm_bindgen(js_name = memoryUndo, unchecked_return_type = "Reply")]
pub fn undo(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
) -> Result<JsValue, JsValue> {
    execute::<Reply>(|engine| {
        (|| Ok(engine.undo(id(owner)?, id(session)?, false)))().unwrap_or_else(|code| code)
    })
}
#[wasm_bindgen(js_name = memoryRedo, unchecked_return_type = "Reply")]
pub fn redo(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
) -> Result<JsValue, JsValue> {
    execute::<Reply>(|engine| {
        (|| Ok(engine.undo(id(owner)?, id(session)?, true)))().unwrap_or_else(|code| code)
    })
}
