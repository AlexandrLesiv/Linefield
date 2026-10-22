use crate::{
    boundary::{execute_data, id, number},
    snapshots::{GeometryPage, PlacementSnapshot, Reply, StrokeSnapshot},
};
use linefield_editor_engine::Code;
use wasm_bindgen::prelude::*;
#[wasm_bindgen(js_name=memoryStroke,unchecked_return_type="StrokeSnapshot")]
pub fn stroke(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] scene: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] stroke: JsValue,
) -> Result<JsValue, JsValue> {
    execute_data::<StrokeSnapshot>(|e, d| {
        match (|| e.stroke_info(id(owner)?, id(session)?, id(scene)?, id(stroke)?))() {
            Ok((count, style, active)) => {
                d.count.set(count);
                d.style.set(style);
                d.stroke_active.set(active);
                Code::Ok
            }
            Err(c) => c,
        }
    })
}
#[wasm_bindgen(js_name=memoryGeometryPage,unchecked_return_type="GeometryPage")]
#[expect(
    clippy::too_many_arguments,
    reason = "MIG-C1 generated named typed boundary"
)]
pub fn page(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] scene: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] stroke: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] geometry: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] chunk: JsValue,
    #[wasm_bindgen(unchecked_param_type = "number")] detail: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] cursor: JsValue,
) -> Result<JsValue, JsValue> {
    execute_data::<GeometryPage>(|e, d| {
        match (|| {
            e.geometry_page(
                id(owner)?,
                id(session)?,
                id(scene)?,
                id(stroke)?,
                id(geometry)?,
                id(chunk)?,
                number(detail)?,
                id(cursor)?,
            )
        })() {
            Ok(page) => {
                *d.page.borrow_mut() = Some(page);
                Code::Ok
            }
            Err(c) => c,
        }
    })
}
#[wasm_bindgen(js_name=memoryPlacement,unchecked_return_type="PlacementSnapshot")]
pub fn placement(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] mapping: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] stroke: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] page: JsValue,
) -> Result<JsValue, JsValue> {
    execute_data::<PlacementSnapshot>(|e, d| {
        match (|| {
            e.placement(
                id(owner)?,
                id(session)?,
                id(mapping)?,
                id(stroke)?,
                id(page)?,
            )
        })() {
            Ok(p) => {
                d.placement.set(p);
                Code::Ok
            }
            Err(c) => c,
        }
    })
}
#[wasm_bindgen(js_name=memoryReleasePage,unchecked_return_type="Reply")]
pub fn release(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] page: JsValue,
) -> Result<JsValue, JsValue> {
    execute_data::<Reply>(|e, _| {
        (|| {
            e.session(id(owner)?, id(session)?)?;
            e.release_page(id(page)?);
            Ok(Code::Ok)
        })()
        .unwrap_or_else(|c| c)
    })
}
