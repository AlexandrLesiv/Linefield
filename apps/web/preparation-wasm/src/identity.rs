use linefield_contour_preparation::Identity;
use wasm_bindgen::prelude::*;
pub(crate) fn id(value: JsValue) -> Result<u64, JsValue> {
    if !value.is_bigint() {
        return Err(JsValue::from_str("invalid"));
    }
    u64::try_from(value.unchecked_into::<js_sys::BigInt>())
        .map_err(|_| JsValue::from_str("invalid"))
}
#[wasm_bindgen]
pub struct PreparationIdentity(pub(crate) Identity);
#[wasm_bindgen]
impl PreparationIdentity {
    #[wasm_bindgen(constructor)]
    #[expect(
        clippy::too_many_arguments,
        reason = "P05-R08 Gate0 freezes the checked scalar identity constructor"
    )]
    pub fn new(
        #[wasm_bindgen(unchecked_param_type = "bigint")] worker_epoch: JsValue,
        #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
        #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
        #[wasm_bindgen(unchecked_param_type = "bigint")] stroke: JsValue,
        #[wasm_bindgen(unchecked_param_type = "bigint")] capture: JsValue,
        #[wasm_bindgen(unchecked_param_type = "0 | 1")] projection_kind: JsValue,
        #[wasm_bindgen(unchecked_param_type = "bigint")] projection: JsValue,
        #[wasm_bindgen(unchecked_param_type = "bigint")] samples: JsValue,
        #[wasm_bindgen(unchecked_param_type = "bigint")] verbs: JsValue,
        #[wasm_bindgen(unchecked_param_type = "1")] algorithm_version: JsValue,
    ) -> Result<Self, JsValue> {
        let kind = match projection_kind.as_f64() {
            Some(0.0) => 0,
            Some(1.0) => 1,
            _ => return Err(JsValue::from_str("invalid")),
        };
        if algorithm_version.as_f64() != Some(1.0) {
            return Err(JsValue::from_str("invalid"));
        }
        Ok(Self(Identity {
            worker_epoch: id(worker_epoch)?,
            owner: id(owner)?,
            session: id(session)?,
            stroke: id(stroke)?,
            capture: id(capture)?,
            projection_kind: kind,
            projection: id(projection)?,
            samples: id(samples)?,
            verbs: id(verbs)?,
        }))
    }
}
