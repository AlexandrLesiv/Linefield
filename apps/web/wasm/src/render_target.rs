use crate::boundary::{execute, execute_data, id};
use crate::snapshots::{RenderTarget, Reply};
use linefield_editor_engine::Code;
use wasm_bindgen::prelude::*;
#[wasm_bindgen(js_name = memoryRenderCapture, unchecked_return_type = "RenderTarget")]
pub fn render_capture(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] mapping: JsValue,
) -> Result<JsValue, JsValue> {
    execute_data::<RenderTarget>(|engine, data| {
        match (|| engine.render_capture(id(owner)?, id(session)?, id(mapping)?))() {
            Ok(value) => {
                data.payload.borrow_mut().render_target = value;
                Code::Ok
            }
            Err(code) => code,
        }
    })
}
#[wasm_bindgen(js_name = memoryRenderTransform, unchecked_return_type = "RenderTarget")]
pub fn render_transform(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] target: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] mapping: JsValue,
) -> Result<JsValue, JsValue> {
    execute_data::<RenderTarget>(|engine, data| {
        match (|| engine.render_transform(id(owner)?, id(session)?, id(target)?, id(mapping)?))() {
            Ok(value) => {
                data.payload.borrow_mut().render_target = value;
                Code::Ok
            }
            Err(code) => code,
        }
    })
}
#[wasm_bindgen(js_name = memoryRenderAdopt, unchecked_return_type = "Reply")]
pub fn render_adopt(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] target: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] mapping: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] presentation: JsValue,
) -> Result<JsValue, JsValue> {
    execute::<Reply>(|engine| {
        (|| {
            Ok(engine.render_adopt(
                id(owner)?,
                id(session)?,
                id(target)?,
                id(mapping)?,
                id(presentation)?,
            ))
        })()
        .unwrap_or_else(|code| code)
    })
}
#[wasm_bindgen(js_name = memoryRenderRelease, unchecked_return_type = "Reply")]
pub fn render_release(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] target: JsValue,
) -> Result<JsValue, JsValue> {
    execute::<Reply>(|engine| {
        (|| Ok(engine.render_release(id(owner)?, id(session)?, id(target)?)))()
            .unwrap_or_else(|code| code)
    })
}
#[wasm_bindgen]
impl RenderTarget {
    #[wasm_bindgen(getter)]
    pub fn target(&self) -> u64 {
        self.0.0.payload.borrow().render_target.id
    }
    #[wasm_bindgen(getter)]
    pub fn backing(&self) -> f64 {
        self.0.0.payload.borrow().render_target.backing
    }
    #[wasm_bindgen(getter,js_name=canAdopt)]
    pub fn can_adopt(&self) -> bool {
        self.0.0.payload.borrow().render_target.can_adopt
    }
    #[wasm_bindgen(getter,js_name=sourceMapping)]
    pub fn source_mapping(&self) -> u64 {
        self.0.0.payload.borrow().render_target.preview.mapping
    }
    #[wasm_bindgen(getter)]
    pub fn outside(&self) -> bool {
        self.0.0.payload.borrow().render_target.preview.outside
    }
    #[wasm_bindgen(getter)]
    pub fn m11(&self) -> f64 {
        self.0.0.payload.borrow().render_target.preview.affine[0]
    }
    #[wasm_bindgen(getter)]
    pub fn m12(&self) -> f64 {
        self.0.0.payload.borrow().render_target.preview.affine[1]
    }
    #[wasm_bindgen(getter)]
    pub fn m21(&self) -> f64 {
        self.0.0.payload.borrow().render_target.preview.affine[2]
    }
    #[wasm_bindgen(getter)]
    pub fn m22(&self) -> f64 {
        self.0.0.payload.borrow().render_target.preview.affine[3]
    }
    #[wasm_bindgen(getter,js_name=offsetX)]
    pub fn offset_x(&self) -> f64 {
        self.0.0.payload.borrow().render_target.preview.affine[4]
    }
    #[wasm_bindgen(getter,js_name=offsetY)]
    pub fn offset_y(&self) -> f64 {
        self.0.0.payload.borrow().render_target.preview.affine[5]
    }
}
