use crate::snapshots::RasterProofSnapshot;
use linefield_editor_engine::{numerics::raster_offset::Outcome, raster_probe::layouts};
use wasm_bindgen::prelude::*;
#[derive(Clone, Copy, Default)]
pub struct Result {
    pub epoch: u64,
    pub offset: [i32; 2],
    pub enabled: bool,
    pub outcome: Outcome,
}
#[wasm_bindgen]
impl RasterProofSnapshot {
    #[wasm_bindgen(getter)]
    pub fn epoch(&self) -> u64 {
        self.0.0.raster.get().epoch
    }
    #[wasm_bindgen(getter)]
    pub fn enabled(&self) -> bool {
        self.0.0.raster.get().enabled
    }
    #[wasm_bindgen(getter)]
    pub fn outcome(&self) -> String {
        self.0.0.raster.get().outcome.label().into()
    }
    #[wasm_bindgen(getter,js_name=offsetX)]
    pub fn x(&self) -> i32 {
        self.0.0.raster.get().offset[0]
    }
    #[wasm_bindgen(getter,js_name=offsetY)]
    pub fn y(&self) -> i32 {
        self.0.0.raster.get().offset[1]
    }
    #[wasm_bindgen(getter,js_name=rasterBytes)]
    pub fn raster_bytes(&self) -> u32 {
        layouts()[0] as u32
    }
    #[wasm_bindgen(getter,js_name=frameBytes)]
    pub fn frame_bytes(&self) -> u32 {
        layouts()[1] as u32
    }
    #[wasm_bindgen(getter,js_name=tailBytes)]
    pub fn tail_bytes(&self) -> u32 {
        layouts()[2] as u32
    }
    #[wasm_bindgen(getter,js_name=registryBytes)]
    pub fn registry_bytes(&self) -> u32 {
        layouts()[3] as u32
    }
    #[wasm_bindgen(getter,js_name=stateBytes)]
    pub fn state_bytes(&self) -> u32 {
        layouts()[4] as u32
    }
}
