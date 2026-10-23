use crate::{
    boundary::{execute_query, id},
    snapshots::FramePanReuseSnapshot,
};
use linefield_editor_engine::Code;
use wasm_bindgen::prelude::*;

#[wasm_bindgen(typescript_custom_section)]
const TYPES: &str = r#"
export type FramePanReuseMiss = "none" | "fractional" | "basis" | "range" | "uncertified" | "source-relation" | "unavailable";
"#;
#[wasm_bindgen(js_name=memoryFramePanReuse,unchecked_return_type="FramePanReuseSnapshot")]
pub fn reuse(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] mapping: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] source: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] target: JsValue,
) -> Result<JsValue, JsValue> {
    execute_query::<FramePanReuseSnapshot>(|e, d| {
        match (|| {
            e.frame_pan_reuse(
                id(owner)?,
                id(session)?,
                id(mapping)?,
                id(source)?,
                id(target)?,
            )
        })() {
            Ok(value) => {
                d.pan_reuse.set(value);
                Code::Ok
            }
            Err(code) => code,
        }
    })
}
#[wasm_bindgen]
impl FramePanReuseSnapshot {
    #[wasm_bindgen(getter)]
    pub fn reusable(&self) -> bool {
        self.0.0.pan_reuse.get().reusable
    }
    #[wasm_bindgen(getter, js_name=missReason, unchecked_return_type="FramePanReuseMiss")]
    pub fn miss_reason(&self) -> JsValue {
        JsValue::from_str(self.0.0.pan_reuse.get().miss.label())
    }
    #[wasm_bindgen(getter, js_name=sourceCount)]
    pub fn source_count(&self) -> u64 {
        self.0.0.pan_reuse.get().source_count
    }
    #[wasm_bindgen(getter, js_name=sourceThrough)]
    pub fn source_through(&self) -> u64 {
        self.0.0.pan_reuse.get().source_through
    }
    #[wasm_bindgen(getter, js_name=targetCount)]
    pub fn target_count(&self) -> u64 {
        self.0.0.pan_reuse.get().target_count
    }
    #[wasm_bindgen(getter, js_name=targetThrough)]
    pub fn target_through(&self) -> u64 {
        self.0.0.pan_reuse.get().target_through
    }
}

#[wasm_bindgen]
impl FramePanReuseSnapshot {
    #[wasm_bindgen(getter)]
    pub fn epoch(&self) -> u64 {
        self.0.0.pan_reuse.get().epoch
    }
    #[wasm_bindgen(getter, js_name=shiftX)]
    pub fn shift_x(&self) -> i32 {
        self.0.0.pan_reuse.get().shift[0]
    }
    #[wasm_bindgen(getter, js_name=shiftY)]
    pub fn shift_y(&self) -> i32 {
        self.0.0.pan_reuse.get().shift[1]
    }
}
