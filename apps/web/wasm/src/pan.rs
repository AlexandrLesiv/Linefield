use crate::boundary::{execute, id, number};
use crate::snapshots::Reply;
use wasm_bindgen::prelude::*;
#[wasm_bindgen(js_name = memoryPanBegin, unchecked_return_type = "Reply")]
pub fn pan_begin(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] mapping: JsValue,
    #[wasm_bindgen(unchecked_param_type = "number")] pointer: JsValue,
    #[wasm_bindgen(unchecked_param_type = "number")] x: JsValue,
    #[wasm_bindgen(unchecked_param_type = "number")] y: JsValue,
) -> Result<JsValue, JsValue> {
    execute::<Reply>(|engine| {
        (|| {
            Ok(engine.pan_begin(
                id(owner)?,
                id(session)?,
                id(mapping)?,
                number(pointer)?,
                [number(x)?, number(y)?],
            ))
        })()
        .unwrap_or_else(|code| code)
    })
}
#[wasm_bindgen(js_name = memoryPanUpdate, unchecked_return_type = "Reply")]
pub fn pan_update(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] interaction: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] base_mapping: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] sequence: JsValue,
    #[wasm_bindgen(unchecked_param_type = "number")] x: JsValue,
    #[wasm_bindgen(unchecked_param_type = "number")] y: JsValue,
) -> Result<JsValue, JsValue> {
    execute::<Reply>(|engine| {
        let identities = (|| {
            let ids = (
                id(owner)?,
                id(session)?,
                id(interaction)?,
                id(base_mapping)?,
            );
            engine.pan_identity(ids.0, ids.1, ids.2, ids.3)?;
            Ok(ids)
        })();
        let (o, s, i, m) = match identities {
            Ok(v) => v,
            Err(code) => return code,
        };
        match (|| Ok((id(sequence)?, [number(x)?, number(y)?])))() {
            Ok((sequence, point)) => engine.pan_update(o, s, i, m, sequence, point),
            Err(code) => engine.cancel_current(code),
        }
    })
}
#[wasm_bindgen(js_name = memoryPanEnd, unchecked_return_type = "Reply")]
pub fn pan_end(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] interaction: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] base_mapping: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] next_sequence: JsValue,
) -> Result<JsValue, JsValue> {
    execute::<Reply>(|engine| {
        let identities = (|| {
            let ids = (
                id(owner)?,
                id(session)?,
                id(interaction)?,
                id(base_mapping)?,
            );
            engine.pan_identity(ids.0, ids.1, ids.2, ids.3)?;
            Ok(ids)
        })();
        let (o, s, i, m) = match identities {
            Ok(v) => v,
            Err(code) => return code,
        };
        match id(next_sequence) {
            Ok(next) => engine.pan_end(o, s, i, m, next),
            Err(code) => engine.cancel_current(code),
        }
    })
}
