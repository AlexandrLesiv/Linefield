use crate::{
    boundary::{execute, number},
    snapshots::Reply,
};
use linefield_editor_engine::Code;
use wasm_bindgen::prelude::*;
#[wasm_bindgen(js_name=fixtureTerminalReserve,unchecked_return_type="Reply")]
pub fn terminal() -> Result<JsValue, JsValue> {
    execute::<Reply>(|e| e.fixture_terminal_reserve())
}
#[wasm_bindgen(js_name=fixtureFarView,unchecked_return_type="Reply")]
pub fn far(
    #[wasm_bindgen(unchecked_param_type = "bigint")] region: JsValue,
    #[wasm_bindgen(unchecked_param_type = "number")] local: JsValue,
) -> Result<JsValue, JsValue> {
    execute::<Reply>(|e| {
        (|| {
            if !region.is_bigint() {
                return Err(Code::Invalid);
            }
            let r = i64::try_from(region.unchecked_into::<js_sys::BigInt>())
                .map_err(|_| Code::Invalid)?;
            Ok(e.fixture_far_view(r, number(local)?))
        })()
        .unwrap_or_else(|c: Code| c)
    })
}
