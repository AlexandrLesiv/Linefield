use crate::boundary::{execute, id, number, pointer_id};
use crate::snapshots::Reply;
use linefield_editor_engine::{Code, Input};
use wasm_bindgen::prelude::*;
#[wasm_bindgen(js_name = memoryBegin, unchecked_return_type = "Reply")]
#[expect(
    clippy::too_many_arguments,
    reason = "WMP-C2 fixes this named typed ABI; do not replace it with an object packet"
)]
pub fn begin(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] mapping: JsValue,
    #[wasm_bindgen(unchecked_param_type = "number")] pointer: JsValue,
    #[wasm_bindgen(unchecked_param_type = "number")] x: JsValue,
    #[wasm_bindgen(unchecked_param_type = "number")] y: JsValue,
    #[wasm_bindgen(unchecked_param_type = "number")] pressure: JsValue,
    #[wasm_bindgen(unchecked_param_type = "boolean")] has_pressure: JsValue,
) -> Result<JsValue, JsValue> {
    execute::<Reply>(|engine| {
        (|| {
            Ok(engine.begin(
                id(owner)?,
                id(session)?,
                id(mapping)?,
                pointer_id(pointer)?,
                Input {
                    x: number(x)?,
                    y: number(y)?,
                    pressure: number(pressure)?,
                    present: has_pressure.as_bool().ok_or(Code::Invalid)?,
                },
            ))
        })()
        .unwrap_or_else(|code| code)
    })
}
#[wasm_bindgen(js_name = memoryAppend, unchecked_return_type = "Reply")]
#[expect(
    clippy::too_many_arguments,
    reason = "WMP-C2 fixes this named typed ABI; do not replace it with an object packet"
)]
pub fn append(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] interaction: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] mapping: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] first_index: JsValue,
    #[wasm_bindgen(unchecked_param_type = "Float64Array")] x: JsValue,
    #[wasm_bindgen(unchecked_param_type = "Float64Array")] y: JsValue,
    #[wasm_bindgen(unchecked_param_type = "Float64Array")] pressure: JsValue,
    #[wasm_bindgen(unchecked_param_type = "Uint8Array")] has_pressure: JsValue,
) -> Result<JsValue, JsValue> {
    execute::<Reply>(|engine| {
        let identities = (|| {
            let (o, s, i, m) = (id(owner)?, id(session)?, id(interaction)?, id(mapping)?);
            engine.interaction(o, s, i, m)?;
            Ok((o, s, i, m))
        })();
        let (o, s, i, m) = match identities {
            Ok(value) => value,
            Err(code) => return code,
        };
        match id(first_index).and_then(|first| {
            crate::arrays::inputs(x, y, pressure, has_pressure).map(|inputs| (first, inputs))
        }) {
            Ok((first, inputs)) => engine.append(o, s, i, m, first, &inputs),
            Err(code) => engine.cancel_current(code),
        }
    })
}
#[wasm_bindgen(js_name = memoryEnd, unchecked_return_type = "Reply")]
pub fn end(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] interaction: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] mapping: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] next_index: JsValue,
) -> Result<JsValue, JsValue> {
    execute::<Reply>(|engine| {
        let identities = (|| {
            let ids = (id(owner)?, id(session)?, id(interaction)?, id(mapping)?);
            engine.interaction(ids.0, ids.1, ids.2, ids.3)?;
            Ok(ids)
        })();
        let (o, s, i, m) = match identities {
            Ok(value) => value,
            Err(code) => return code,
        };
        match id(next_index) {
            Ok(next) => engine.end(o, s, i, m, next),
            Err(code) => engine.cancel_current(code),
        }
    })
}
#[wasm_bindgen(js_name = memoryCancel, unchecked_return_type = "Reply")]
pub fn cancel(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] interaction: JsValue,
    #[wasm_bindgen(
        unchecked_param_type = "'escape' | 'blur' | 'pointer-cancel' | 'capture-loss' | 'queue-overflow'"
    )]
    cause: JsValue,
) -> Result<JsValue, JsValue> {
    execute::<Reply>(|engine| {
        (|| {
            if !cause.is_string() {
                return Err(Code::Invalid);
            }
            if ![
                "escape",
                "blur",
                "pointer-cancel",
                "capture-loss",
                "queue-overflow",
            ]
            .iter()
            .any(|value| cause == JsValue::from_str(value))
            {
                return Err(Code::Invalid);
            }
            Ok(engine.cancel(id(owner)?, id(session)?, id(interaction)?))
        })()
        .unwrap_or_else(|code| code)
    })
}
