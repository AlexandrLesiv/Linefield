use crate::{
    boundary::{execute_query, id},
    snapshots::{DisplayFrameSnapshot, LiveFrameSnapshot},
};
use linefield_editor_engine::Code;
use wasm_bindgen::prelude::*;

#[wasm_bindgen(js_name=memoryLiveFrameCapture,unchecked_return_type="LiveFrameSnapshot")]
pub fn live_capture(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] mapping: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] expected_source: JsValue,
) -> Result<JsValue, JsValue> {
    execute_query::<LiveFrameSnapshot>(|e, d| {
        match (|| {
            e.capture_live_frame(id(owner)?, id(session)?, id(mapping)?, id(expected_source)?)
        })() {
            Ok(value) => {
                d.capture.set(value);
                Code::Ok
            }
            Err(code) => code,
        }
    })
}
#[wasm_bindgen(js_name=memoryDisplayFrameCapture,unchecked_return_type="DisplayFrameSnapshot")]
pub fn display_capture(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] mapping: JsValue,
) -> Result<JsValue, JsValue> {
    execute_query::<DisplayFrameSnapshot>(|e, d| {
        match (|| e.capture_display_frame(id(owner)?, id(session)?, id(mapping)?))() {
            Ok(value) => {
                d.capture.set(value);
                Code::Ok
            }
            Err(code) => code,
        }
    })
}
#[wasm_bindgen(js_name=memoryViewDisplayFrameCapture,unchecked_return_type="DisplayFrameSnapshot")]
pub fn view_display_capture(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] mapping: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] candidate: JsValue,
) -> Result<JsValue, JsValue> {
    execute_query::<DisplayFrameSnapshot>(|e, d| {
        match (|| {
            e.capture_view_display_frame(id(owner)?, id(session)?, id(mapping)?, id(candidate)?)
        })() {
            Ok(value) => {
                d.capture.set(value);
                Code::Ok
            }
            Err(code) => code,
        }
    })
}
#[wasm_bindgen]
impl LiveFrameSnapshot {
    #[wasm_bindgen(getter,js_name=frameId)]
    pub fn frame_id(&self) -> u64 {
        self.0.0.capture.get().id
    }
    #[wasm_bindgen(getter)]
    pub fn source(&self) -> u64 {
        self.0.0.capture.get().source
    }
    #[wasm_bindgen(getter,js_name=sourceCount)]
    pub fn source_count(&self) -> u64 {
        self.0.0.capture.get().source_count
    }
    #[wasm_bindgen(getter)]
    pub fn ordinal(&self) -> u64 {
        self.0.0.capture.get().ordinal
    }
    #[wasm_bindgen(getter,js_name=frameMapping)]
    pub fn frame_mapping(&self) -> u64 {
        self.0.0.capture.get().mapping
    }
}
#[wasm_bindgen]
impl DisplayFrameSnapshot {
    #[wasm_bindgen(getter,js_name=frameId)]
    pub fn frame_id(&self) -> u64 {
        self.0.0.capture.get().id
    }
    #[wasm_bindgen(getter,js_name=cutoffCount)]
    pub fn cutoff_count(&self) -> u64 {
        self.0.0.capture.get().cutoff_count
    }
    #[wasm_bindgen(getter,js_name=cutoffThrough)]
    pub fn cutoff_through(&self) -> u64 {
        self.0.0.capture.get().cutoff_through
    }
    #[wasm_bindgen(getter,js_name=frameMapping)]
    pub fn frame_mapping(&self) -> u64 {
        self.0.0.capture.get().mapping
    }
}
