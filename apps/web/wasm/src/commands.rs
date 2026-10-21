use crate::{
    boundary::{execute, id, number},
    snapshots::Reply,
};
use linefield_editor_engine::{Code, Style};
use wasm_bindgen::prelude::*;
#[wasm_bindgen(js_name=memoryStyle,unchecked_return_type="Reply")]
pub fn style(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "number")] width: JsValue,
    #[wasm_bindgen(unchecked_param_type = "number")] red: JsValue,
    #[wasm_bindgen(unchecked_param_type = "number")] green: JsValue,
    #[wasm_bindgen(unchecked_param_type = "number")] blue: JsValue,
) -> Result<JsValue, JsValue> {
    execute::<Reply>(|e| {
        (|| {
            Ok(e.style(
                id(owner)?,
                id(session)?,
                Style {
                    width: number(width)?,
                    rgb: [number(red)?, number(green)?, number(blue)?],
                    ..Style::default()
                },
            ))
        })()
        .unwrap_or_else(|c: Code| c)
    })
}
#[wasm_bindgen(js_name=memoryUndo,unchecked_return_type="Reply")]
pub fn undo(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
) -> Result<JsValue, JsValue> {
    execute::<Reply>(|e| {
        (|| Ok(e.undo(id(owner)?, id(session)?, false)))().unwrap_or_else(|c: Code| c)
    })
}
#[wasm_bindgen(js_name=memoryRedo,unchecked_return_type="Reply")]
pub fn redo(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
) -> Result<JsValue, JsValue> {
    execute::<Reply>(|e| {
        (|| Ok(e.undo(id(owner)?, id(session)?, true)))().unwrap_or_else(|c: Code| c)
    })
}
