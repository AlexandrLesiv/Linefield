use crate::snapshots::{GeometryPage, PlacementSnapshot, StrokeSnapshot};
use wasm_bindgen::prelude::*;
#[wasm_bindgen]
impl StrokeSnapshot {
    #[wasm_bindgen(getter)]
    pub fn count(&self) -> u64 {
        self.0.0.count.get()
    }
    #[wasm_bindgen(getter)]
    pub fn red(&self) -> f64 {
        self.0.0.style.get().rgb[0]
    }
    #[wasm_bindgen(getter)]
    pub fn green(&self) -> f64 {
        self.0.0.style.get().rgb[1]
    }
    #[wasm_bindgen(getter)]
    pub fn blue(&self) -> f64 {
        self.0.0.style.get().rgb[2]
    }
    #[wasm_bindgen(getter)]
    pub fn opacity(&self) -> f64 {
        self.0.0.style.get().opacity
    }
}
#[wasm_bindgen]
impl GeometryPage {
    #[wasm_bindgen(getter)]
    pub fn page(&self) -> u64 {
        self.0.0.page.borrow().as_ref().map_or(0, |p| p.page)
    }
    #[wasm_bindgen(getter)]
    pub fn next(&self) -> u64 {
        self.0.0.page.borrow().as_ref().map_or(0, |p| p.next)
    }
    #[wasm_bindgen(getter)]
    pub fn done(&self) -> bool {
        self.0.0.page.borrow().as_ref().is_none_or(|p| p.done)
    }
    #[wasm_bindgen(getter)]
    pub fn revision(&self) -> u64 {
        self.0.0.page.borrow().as_ref().map_or(0, |p| p.revision)
    }
    #[wasm_bindgen(getter)]
    pub fn capsules(&self) -> Result<Box<[f32]>, JsValue> {
        if self.0.0.consumed.replace(true) {
            return Err(JsValue::from_str("snapshot-consumed"));
        }
        Ok(self
            .0
            .0
            .page
            .borrow_mut()
            .as_mut()
            .map_or_else(Vec::new, |p| std::mem::take(&mut p.data))
            .into_boxed_slice())
    }
}
#[wasm_bindgen]
impl PlacementSnapshot {
    #[wasm_bindgen(getter)]
    pub fn available(&self) -> bool {
        self.0.0.placement.get().available
    }
    #[wasm_bindgen(getter)]
    pub fn matrix(&self) -> Result<Box<[f32]>, JsValue> {
        if self.0.0.consumed.replace(true) {
            return Err(JsValue::from_str("snapshot-consumed"));
        }
        Ok(self.0.0.placement.get().matrix.to_vec().into_boxed_slice())
    }
}
