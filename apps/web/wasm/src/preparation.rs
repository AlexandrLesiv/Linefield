use crate::{
    boundary::{execute_data, id, number},
    snapshots::{PreparationSnapshot, Reply},
};
use linefield_editor_engine::Code;
use wasm_bindgen::prelude::*;
#[wasm_bindgen(js_name=memoryPreparation,unchecked_return_type="PreparationSnapshot")]
pub fn begin(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] scene: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] stroke: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] chunk: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] revision: JsValue,
    #[wasm_bindgen(unchecked_param_type = "number")] detail: JsValue,
) -> Result<JsValue, JsValue> {
    execute_data::<PreparationSnapshot>(|e, d| {
        match (|| {
            e.preparation(
                id(owner)?,
                id(session)?,
                id(scene)?,
                id(stroke)?,
                id(chunk)?,
                id(revision)?,
                number(detail)?,
            )
        })() {
            Ok(value) => {
                *d.preparation.borrow_mut() = Some(value);
                Code::Ok
            }
            Err(c) => c,
        }
    })
}
#[wasm_bindgen(js_name=memoryAdoptPreparation,unchecked_return_type="PreparationSnapshot")]
pub fn adopt(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] token: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] ordinal: JsValue,
    #[wasm_bindgen(unchecked_param_type = "Float32Array")] data: JsValue,
    #[wasm_bindgen(unchecked_param_type = "Float64Array")] origin: JsValue,
) -> Result<JsValue, JsValue> {
    execute_data::<PreparationSnapshot>(|e, d| {
        match (|| {
            e.adopt_preparation(
                id(owner)?,
                id(session)?,
                id(token)?,
                id(ordinal)?,
                &crate::arrays::geometry(data)?,
                crate::arrays::origin(origin)?,
            )
        })() {
            Ok(page) => {
                d.count.set(page);
                Code::Ok
            }
            Err(c) => c,
        }
    })
}
#[wasm_bindgen(js_name=memoryPreparationCurrent,unchecked_return_type="Reply")]
pub fn current(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] token: JsValue,
) -> Result<JsValue, JsValue> {
    execute_data::<Reply>(|e, _| {
        (|| e.preparation_current(id(owner)?, id(session)?, id(token)?))()
            .map_or_else(|c| c, |()| Code::Ok)
    })
}
#[wasm_bindgen(js_name=memoryReleasePreparation,unchecked_return_type="Reply")]
pub fn release(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] token: JsValue,
) -> Result<JsValue, JsValue> {
    execute_data::<Reply>(|e, _| {
        (|| Ok(e.release_preparation(id(owner)?, id(session)?, id(token)?)))().unwrap_or_else(|c| c)
    })
}
#[wasm_bindgen]
impl PreparationSnapshot {
    #[wasm_bindgen(getter)]
    pub fn token(&self) -> u64 {
        self.0
            .0
            .preparation
            .borrow()
            .as_ref()
            .map_or(0, |p| p.token)
    }
    #[wasm_bindgen(getter)]
    pub fn page(&self) -> u64 {
        self.0.0.count.get()
    }
    #[wasm_bindgen(getter)]
    pub fn parameters(&self) -> Box<[f64]> {
        let value = self.0.0.preparation.borrow();
        let Some(p) = value.as_ref() else {
            return Box::new([]);
        };
        let b = p.clip.unwrap_or([0.0; 4]);
        Box::new([
            p.first as f64,
            p.end as f64,
            p.detail,
            if p.clip.is_some() { 1.0 } else { 0.0 },
            b[0],
            b[1],
            b[2],
            b[3],
        ])
    }
    #[wasm_bindgen(getter)]
    pub fn points(&self) -> Result<Box<[f64]>, JsValue> {
        if self.0.0.consumed.replace(true) {
            return Err(JsValue::from_str("snapshot-consumed"));
        }
        let mut value = self.0.0.preparation.borrow_mut();
        let Some(p) = value.as_mut() else {
            return Ok(Box::new([]));
        };
        let mut out = Vec::new();
        out.try_reserve_exact(p.points.len() * 3)
            .map_err(|_| JsValue::from_str("capacity"))?;
        for row in &p.points {
            out.extend_from_slice(row);
        }
        p.points.clear();
        Ok(out.into_boxed_slice())
    }
}
