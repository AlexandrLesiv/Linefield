use crate::boundary::{execute, id};
use crate::snapshots::Reply;
use linefield_editor_engine::{Code, PanDirection};
use wasm_bindgen::prelude::*;
#[wasm_bindgen(js_name = memoryPanStep, unchecked_return_type = "Reply")]
pub fn pan_step(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] mapping: JsValue,
    #[wasm_bindgen(unchecked_param_type = "'left' | 'right' | 'up' | 'down'")] direction: JsValue,
) -> Result<JsValue, JsValue> {
    execute::<Reply>(|engine| {
        (|| {
            let selected = [
                ("left", PanDirection::Left),
                ("right", PanDirection::Right),
                ("up", PanDirection::Up),
                ("down", PanDirection::Down),
            ]
            .into_iter()
            .find(|(name, _)| direction == JsValue::from_str(name))
            .map(|(_, value)| value)
            .ok_or(Code::Invalid)?;
            Ok(engine.pan_step(id(owner)?, id(session)?, id(mapping)?, selected))
        })()
        .unwrap_or_else(|code| code)
    })
}
#[wasm_bindgen(js_name = memoryZoomStep, unchecked_return_type = "Reply")]
pub fn zoom_step(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] mapping: JsValue,
    #[wasm_bindgen(unchecked_param_type = "'in' | 'out'")] direction: JsValue,
) -> Result<JsValue, JsValue> {
    execute::<Reply>(|engine| {
        (|| {
            let inward = if direction == JsValue::from_str("in") {
                true
            } else if direction == JsValue::from_str("out") {
                false
            } else {
                return Err(Code::Invalid);
            };
            Ok(engine.zoom_step(id(owner)?, id(session)?, id(mapping)?, inward))
        })()
        .unwrap_or_else(|code| code)
    })
}
