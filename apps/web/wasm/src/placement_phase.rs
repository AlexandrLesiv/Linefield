use crate::snapshots::PlacementSnapshot;
use wasm_bindgen::prelude::*;
#[wasm_bindgen(typescript_custom_section)]
const TYPES: &str = r#"
export type PlacementDisposition = "visible" | "invisible" | "anchorMiss";
export type RasterMiss = "none" | "range" | "residual" | "envelope" | "phase";
"#;
#[wasm_bindgen]
impl PlacementSnapshot {
    #[wasm_bindgen(getter, js_name=rasterEpoch)]
    pub fn raster_epoch(&self) -> u64 {
        self.0.0.placement.get().raster_epoch
    }
    #[wasm_bindgen(getter, js_name=offsetX)]
    pub fn offset_x(&self) -> i32 {
        self.0.0.placement.get().offset[0]
    }
    #[wasm_bindgen(getter, js_name=offsetY)]
    pub fn offset_y(&self) -> i32 {
        self.0.0.placement.get().offset[1]
    }
    #[wasm_bindgen(getter, unchecked_return_type = "PlacementDisposition")]
    pub fn disposition(&self) -> JsValue {
        JsValue::from_str(self.0.0.placement.get().disposition.label())
    }
    #[wasm_bindgen(getter, js_name=rasterMiss, unchecked_return_type="RasterMiss")]
    pub fn raster_miss(&self) -> JsValue {
        JsValue::from_str(self.0.0.placement.get().raster_miss.label())
    }
}
