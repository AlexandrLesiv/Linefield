use crate::snapshots::{ScenePage, StrokeState};
use wasm_bindgen::prelude::*;
#[wasm_bindgen]
impl StrokeState {
    #[wasm_bindgen(getter)]
    pub fn geometry(&self) -> u64 {
        self.0.0.payload.borrow().geometry
    }
    #[wasm_bindgen(getter)]
    pub fn verbs(&self) -> u64 {
        self.0.0.payload.borrow().verbs
    }
    #[wasm_bindgen(getter)]
    pub fn terminal(&self) -> bool {
        self.0.0.payload.borrow().terminal
    }
}
#[wasm_bindgen]
impl ScenePage {
    #[wasm_bindgen(getter)]
    pub fn geometry(&self) -> u64 {
        self.0.0.payload.borrow().page.geometry
    }
    #[wasm_bindgen(getter)]
    pub fn next(&self) -> u64 {
        self.0.0.payload.borrow().page.next
    }
    #[wasm_bindgen(getter)]
    pub fn done(&self) -> bool {
        self.0.0.payload.borrow().page.done
    }
    #[wasm_bindgen(getter)]
    pub fn stroke(&self) -> u64 {
        self.0.0.payload.borrow().page.stroke
    }
    #[wasm_bindgen(getter)]
    pub fn red(&self) -> f64 {
        self.0.0.payload.borrow().page.color[0]
    }
    #[wasm_bindgen(getter)]
    pub fn green(&self) -> f64 {
        self.0.0.payload.borrow().page.color[1]
    }
    #[wasm_bindgen(getter)]
    pub fn blue(&self) -> f64 {
        self.0.0.payload.borrow().page.color[2]
    }
    #[wasm_bindgen(getter)]
    pub fn verbs(&self) -> Result<Box<[u8]>, JsValue> {
        self.take(1)?;
        Ok(std::mem::take(&mut self.0.0.payload.borrow_mut().page.verbs).into_boxed_slice())
    }
    #[wasm_bindgen(getter)]
    pub fn points(&self) -> Result<Box<[f32]>, JsValue> {
        self.take(2)?;
        Ok(std::mem::take(&mut self.0.0.payload.borrow_mut().page.points).into_boxed_slice())
    }
    #[wasm_bindgen(getter)]
    pub fn weights(&self) -> Result<Box<[f32]>, JsValue> {
        self.take(4)?;
        Ok(std::mem::take(&mut self.0.0.payload.borrow_mut().page.weights).into_boxed_slice())
    }
}
impl ScenePage {
    fn take(&self, flag: u8) -> Result<(), JsValue> {
        let previous = self.0.0.arrays.get();
        if previous & flag != 0 {
            return Err(JsValue::from_str("snapshot-consumed"));
        }
        self.0.0.arrays.set(previous | flag);
        Ok(())
    }
}
