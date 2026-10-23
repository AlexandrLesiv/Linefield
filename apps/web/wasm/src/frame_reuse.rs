use crate::{
    boundary::{execute_query, id},
    snapshots::FrameReuseSnapshot,
};
use linefield_editor_engine::Code;
use wasm_bindgen::prelude::*;

#[wasm_bindgen(typescript_custom_section)]
const TYPES: &str = r#"
export type FrameReuseMiss = "none" | "view" | "same-prefix" | "successor-count";
"#;
#[wasm_bindgen(js_name=memoryFrameReuse,unchecked_return_type="FrameReuseSnapshot")]
pub fn reuse(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] mapping: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] source: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] target: JsValue,
) -> Result<JsValue, JsValue> {
    execute_query::<FrameReuseSnapshot>(|e, d| {
        match (|| {
            e.frame_reuse(
                id(owner)?,
                id(session)?,
                id(mapping)?,
                id(source)?,
                id(target)?,
            )
        })() {
            Ok(value) => {
                d.reuse.set(value);
                Code::Ok
            }
            Err(code) => code,
        }
    })
}
#[wasm_bindgen]
impl FrameReuseSnapshot {
    #[wasm_bindgen(getter)]
    pub fn reusable(&self) -> bool {
        self.0.0.reuse.get().reusable
    }
    #[wasm_bindgen(getter, js_name=missReason, unchecked_return_type="FrameReuseMiss")]
    pub fn miss_reason(&self) -> JsValue {
        JsValue::from_str(self.0.0.reuse.get().miss.label())
    }
    #[wasm_bindgen(getter, js_name=sourceCount)]
    pub fn source_count(&self) -> u64 {
        self.0.0.reuse.get().source_count
    }
    #[wasm_bindgen(getter, js_name=sourceThrough)]
    pub fn source_through(&self) -> u64 {
        self.0.0.reuse.get().source_through
    }
    #[wasm_bindgen(getter, js_name=targetCount)]
    pub fn target_count(&self) -> u64 {
        self.0.0.reuse.get().target_count
    }
    #[wasm_bindgen(getter, js_name=targetThrough)]
    pub fn target_through(&self) -> u64 {
        self.0.0.reuse.get().target_through
    }
}
