use crate::boundary::{execute, id, number};
use crate::snapshots::Reply;
use linefield_editor_engine::Metrics;
use wasm_bindgen::prelude::*;
#[wasm_bindgen(js_name = memoryMetrics, unchecked_return_type = "Reply")]
pub fn memory_metrics(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] mapping: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] sequence: JsValue,
    #[wasm_bindgen(unchecked_param_type = "number")] width: JsValue,
    #[wasm_bindgen(unchecked_param_type = "number")] height: JsValue,
    #[wasm_bindgen(unchecked_param_type = "number")] backing: JsValue,
) -> Result<JsValue, JsValue> {
    execute::<Reply>(|engine| {
        #[cfg(feature = "e2e-fixtures")]
        crate::boundary::fail_metrics_if_armed();
        (|| {
            let owner = id(owner)?;
            let session = id(session)?;
            let mapping = id(mapping)?;
            engine.mapping(owner, session, mapping)?;
            Ok(engine.metrics(
                owner,
                session,
                mapping,
                id(sequence)?,
                Metrics {
                    width: number(width)?,
                    height: number(height)?,
                    backing: number(backing)?,
                },
            ))
        })()
        .unwrap_or_else(|code| code)
    })
}
#[wasm_bindgen(js_name = memorySuspend, unchecked_return_type = "Reply")]
pub fn memory_suspend(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] mapping: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] sequence: JsValue,
) -> Result<JsValue, JsValue> {
    execute::<Reply>(|engine| {
        (|| Ok(engine.suspend(id(owner)?, id(session)?, id(mapping)?, id(sequence)?)))()
            .unwrap_or_else(|code| code)
    })
}
#[wasm_bindgen(js_name = memoryPresented, unchecked_return_type = "Reply")]
pub fn memory_presented(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] presentation: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] mapping: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] content: JsValue,
) -> Result<JsValue, JsValue> {
    execute::<Reply>(|engine| {
        (|| {
            Ok(engine.presented(
                id(owner)?,
                id(session)?,
                id(presentation)?,
                id(mapping)?,
                id(content)?,
            ))
        })()
        .unwrap_or_else(|code| code)
    })
}
