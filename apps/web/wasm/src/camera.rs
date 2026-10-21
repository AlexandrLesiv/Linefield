use crate::{
    boundary::{execute, id, number, pointer_id},
    snapshots::Reply,
};
use linefield_editor_engine::Code;
use wasm_bindgen::prelude::*;
#[wasm_bindgen(js_name=memoryPanBegin,unchecked_return_type="Reply")]
pub fn pan_begin(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] mapping: JsValue,
    #[wasm_bindgen(unchecked_param_type = "number")] pointer: JsValue,
    #[wasm_bindgen(unchecked_param_type = "number")] x: JsValue,
    #[wasm_bindgen(unchecked_param_type = "number")] y: JsValue,
) -> Result<JsValue, JsValue> {
    execute::<Reply>(|e| {
        (|| {
            Ok(e.pan_begin(
                id(owner)?,
                id(session)?,
                id(mapping)?,
                pointer_id(pointer)?,
                number(x)?,
                number(y)?,
                false,
            ))
        })()
        .unwrap_or_else(|c: Code| c)
    })
}
#[wasm_bindgen(js_name=memoryRotateBegin,unchecked_return_type="Reply")]
pub fn rotate_begin(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] mapping: JsValue,
    #[wasm_bindgen(unchecked_param_type = "number")] pointer: JsValue,
    #[wasm_bindgen(unchecked_param_type = "number")] x: JsValue,
    #[wasm_bindgen(unchecked_param_type = "number")] y: JsValue,
) -> Result<JsValue, JsValue> {
    execute::<Reply>(|e| {
        (|| {
            Ok(e.pan_begin(
                id(owner)?,
                id(session)?,
                id(mapping)?,
                pointer_id(pointer)?,
                number(x)?,
                number(y)?,
                true,
            ))
        })()
        .unwrap_or_else(|c: Code| c)
    })
}
#[wasm_bindgen(js_name=memoryPanUpdate,unchecked_return_type="Reply")]
#[expect(
    clippy::too_many_arguments,
    reason = "MIG-C1 generated named typed boundary"
)]
pub fn update(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] interaction: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] mapping: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] sequence: JsValue,
    #[wasm_bindgen(unchecked_param_type = "number")] x: JsValue,
    #[wasm_bindgen(unchecked_param_type = "number")] y: JsValue,
    #[wasm_bindgen(unchecked_param_type = "boolean")] snap: JsValue,
) -> Result<JsValue, JsValue> {
    execute::<Reply>(|e| {
        (|| {
            Ok(e.pan_update(
                id(owner)?,
                id(session)?,
                id(interaction)?,
                id(mapping)?,
                id(sequence)?,
                number(x)?,
                number(y)?,
                snap.as_bool().ok_or(Code::Invalid)?,
            ))
        })()
        .unwrap_or_else(|c: Code| c)
    })
}
#[wasm_bindgen(js_name=memoryPanEnd,unchecked_return_type="Reply")]
pub fn pan_end(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] interaction: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] mapping: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] sequence: JsValue,
) -> Result<JsValue, JsValue> {
    execute::<Reply>(|e| {
        (|| {
            Ok(e.pan_end(
                id(owner)?,
                id(session)?,
                id(interaction)?,
                id(mapping)?,
                id(sequence)?,
            ))
        })()
        .unwrap_or_else(|c: Code| c)
    })
}
#[wasm_bindgen(js_name=memoryRotateAt,unchecked_return_type="Reply")]
pub fn rotate_at(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] mapping: JsValue,
    #[wasm_bindgen(unchecked_param_type = "number")] value: JsValue,
    #[wasm_bindgen(unchecked_param_type = "number")] x: JsValue,
    #[wasm_bindgen(unchecked_param_type = "number")] y: JsValue,
    #[wasm_bindgen(unchecked_param_type = "boolean")] snap: JsValue,
) -> Result<JsValue, JsValue> {
    execute::<Reply>(|e| {
        (|| {
            Ok(e.view_at(
                id(owner)?,
                id(session)?,
                id(mapping)?,
                number(value)?,
                number(x)?,
                number(y)?,
                true,
                snap.as_bool().ok_or(Code::Invalid)?,
            ))
        })()
        .unwrap_or_else(|c: Code| c)
    })
}
#[wasm_bindgen(js_name=memoryZoomAt,unchecked_return_type="Reply")]
pub fn zoom_at(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] mapping: JsValue,
    #[wasm_bindgen(unchecked_param_type = "number")] value: JsValue,
    #[wasm_bindgen(unchecked_param_type = "number")] x: JsValue,
    #[wasm_bindgen(unchecked_param_type = "number")] y: JsValue,
) -> Result<JsValue, JsValue> {
    execute::<Reply>(|e| {
        (|| {
            Ok(e.view_at(
                id(owner)?,
                id(session)?,
                id(mapping)?,
                number(value)?,
                number(x)?,
                number(y)?,
                false,
                false,
            ))
        })()
        .unwrap_or_else(|c: Code| c)
    })
}

#[wasm_bindgen(js_name=memoryResetView,unchecked_return_type="Reply")]
pub fn reset_view(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] mapping: JsValue,
) -> Result<JsValue, JsValue> {
    execute::<Reply>(|e| {
        (|| Ok(e.reset_view(id(owner)?, id(session)?, id(mapping)?)))().unwrap_or_else(|c: Code| c)
    })
}
