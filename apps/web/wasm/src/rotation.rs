use crate::boundary::{execute, id};
use crate::snapshots::Reply;
use linefield_editor_engine::{Code, RotationDirection};
use wasm_bindgen::prelude::*;
#[wasm_bindgen(js_name = memoryRotateStep, unchecked_return_type = "Reply")]
pub fn rotate_step(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] mapping: JsValue,
    #[wasm_bindgen(unchecked_param_type = "'left' | 'right' | 'reset'")] direction: JsValue,
) -> Result<JsValue, JsValue> {
    execute::<Reply>(|engine| {
        (|| {
            let direction = if direction == JsValue::from_str("left") {
                RotationDirection::Left
            } else if direction == JsValue::from_str("right") {
                RotationDirection::Right
            } else if direction == JsValue::from_str("reset") {
                RotationDirection::Reset
            } else {
                return Err(Code::Invalid);
            };
            Ok(engine.rotate_step(id(owner)?, id(session)?, id(mapping)?, direction))
        })()
        .unwrap_or_else(|code| code)
    })
}
