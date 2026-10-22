use crate::{
    boundary::{execute_data, id, number},
    snapshots::{PlacementSnapshot, Reply, TailDisplaySnapshot},
};
use linefield_editor_engine::Code;
use wasm_bindgen::prelude::*;
#[wasm_bindgen(js_name=memoryTailDisplayCapture,unchecked_return_type="TailDisplaySnapshot")]
pub fn capture(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] scene: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] stroke: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] anchor: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] from: JsValue,
    #[wasm_bindgen(unchecked_param_type = "number")] detail: JsValue,
) -> Result<JsValue, JsValue> {
    execute_data::<TailDisplaySnapshot>(|e, d| {
        match (|| {
            e.capture_tail_display(
                id(owner)?,
                id(session)?,
                id(scene)?,
                id(stroke)?,
                id(anchor)?,
                id(from)?,
                number(detail)?,
            )
        })() {
            Ok(v) => {
                d.tail.set(v);
                Code::Ok
            }
            Err(c) => c,
        }
    })
}
#[wasm_bindgen(js_name=memoryTailDisplayStatus,unchecked_return_type="TailDisplaySnapshot")]
pub fn status(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] mapping: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] tail: JsValue,
) -> Result<JsValue, JsValue> {
    execute_data::<TailDisplaySnapshot>(|e, d| {
        match (|| e.tail_display_status(id(owner)?, id(session)?, id(mapping)?, id(tail)?))() {
            Ok(v) => {
                d.tail.set(v);
                Code::Ok
            }
            Err(c) => c,
        }
    })
}
#[wasm_bindgen(js_name=memoryTailDisplayTransform,unchecked_return_type="PlacementSnapshot")]
pub fn transform(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] mapping: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] tail: JsValue,
) -> Result<JsValue, JsValue> {
    execute_data::<PlacementSnapshot>(|e, d| {
        match (|| e.tail_display_transform(id(owner)?, id(session)?, id(mapping)?, id(tail)?))() {
            Ok(v) => {
                d.placement.set(v);
                Code::Ok
            }
            Err(c) => c,
        }
    })
}
#[wasm_bindgen(js_name=memoryTailDisplayRelease,unchecked_return_type="Reply")]
pub fn release(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] tail: JsValue,
) -> Result<JsValue, JsValue> {
    execute_data::<Reply>(|e, _| {
        (|| Ok(e.release_tail_display(id(owner)?, id(session)?, id(tail)?)))().unwrap_or_else(|c| c)
    })
}
#[wasm_bindgen]
impl TailDisplaySnapshot {
    #[wasm_bindgen(getter,js_name=id)]
    pub fn id(&self) -> u64 {
        self.0.0.tail.get().id
    }
    #[wasm_bindgen(getter,js_name=stroke)]
    pub fn stroke(&self) -> u64 {
        self.0.0.tail.get().stroke
    }
    #[wasm_bindgen(getter,js_name=count)]
    pub fn count(&self) -> u64 {
        self.0.0.tail.get().count
    }
    #[wasm_bindgen(getter,js_name=from)]
    pub fn from(&self) -> u64 {
        self.0.0.tail.get().from
    }
    #[wasm_bindgen(getter,js_name=anchorFrame)]
    pub fn anchor(&self) -> u64 {
        self.0.0.tail.get().anchor
    }
    #[wasm_bindgen(getter,js_name=complete)]
    pub fn complete(&self) -> bool {
        self.0.0.tail.get().complete
    }
    #[wasm_bindgen(getter,js_name=exactSource)]
    pub fn exact_source(&self) -> bool {
        self.0.0.tail.get().exact_source
    }
}
