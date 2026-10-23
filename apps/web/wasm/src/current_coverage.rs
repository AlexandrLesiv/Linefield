use crate::{
    boundary::{execute_query, id},
    snapshots::CurrentCoverageSnapshot,
};
use linefield_editor_engine::Code;
use wasm_bindgen::prelude::*;

#[wasm_bindgen(typescript_custom_section)]
const TYPES: &str = r#"
export type LiveCoverageState = "none" | "active" | "ended" | "obsolete" | "included";
"#;
#[wasm_bindgen(js_name=memoryCurrentCoverage,unchecked_return_type="CurrentCoverageSnapshot")]
pub fn current_coverage(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] mapping: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] live_anchor: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] installed_prefix: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] candidate_prefix: JsValue,
) -> Result<JsValue, JsValue> {
    execute_query::<CurrentCoverageSnapshot>(|e, d| {
        match (|| {
            e.current_coverage(
                id(owner)?,
                id(session)?,
                id(mapping)?,
                id(live_anchor)?,
                id(installed_prefix)?,
                id(candidate_prefix)?,
            )
        })() {
            Ok(value) => {
                d.coverage.set(value);
                Code::Ok
            }
            Err(code) => code,
        }
    })
}
