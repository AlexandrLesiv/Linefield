use crate::boundary::Slot;
use wasm_bindgen::prelude::*;
macro_rules! snapshot {
    ($name:ident) => {
        #[wasm_bindgen]
        pub struct $name(pub(crate) Slot);
        impl From<Slot> for $name {
            fn from(slot: Slot) -> Self {
                Self(slot)
            }
        }
        #[wasm_bindgen]
        impl $name {
            #[wasm_bindgen(getter, unchecked_return_type = "Code")]
            pub fn code(&self) -> JsValue {
                JsValue::from_str(self.0.0.value.get().code.label())
            }
            #[wasm_bindgen(getter)]
            pub fn owner(&self) -> u64 {
                self.0.0.value.get().owner
            }
            #[wasm_bindgen(getter)]
            pub fn session(&self) -> u64 {
                self.0.0.value.get().session
            }
            #[wasm_bindgen(getter)]
            pub fn interaction(&self) -> u64 {
                0
            }
            #[wasm_bindgen(getter)]
            pub fn content(&self) -> u64 {
                self.0.0.value.get().content
            }
            #[wasm_bindgen(getter)]
            pub fn scene(&self) -> u64 {
                self.0.0.value.get().scene
            }
            #[wasm_bindgen(getter)]
            pub fn mapping(&self) -> u64 {
                self.0.0.value.get().mapping
            }
            #[wasm_bindgen(getter)]
            pub fn presentation(&self) -> u64 {
                self.0.0.value.get().presentation
            }
            #[wasm_bindgen(getter, js_name = activeCancelled)]
            pub fn active_cancelled(&self) -> bool {
                false
            }
        }
    };
}
snapshot!(Reply);
snapshot!(State);
snapshot!(Mapping);
snapshot!(SceneIds);
#[wasm_bindgen]
impl SceneIds {
    #[wasm_bindgen(getter)]
    pub fn ids(&self) -> Result<Box<[u64]>, JsValue> {
        if self.0.0.consumed.replace(true) {
            return Err(JsValue::from_str("snapshot-consumed"));
        }
        Ok(Vec::new().into_boxed_slice())
    }
    #[wasm_bindgen(getter)]
    pub fn done(&self) -> bool {
        true
    }
}
#[wasm_bindgen]
impl Mapping {
    #[wasm_bindgen(getter)]
    pub fn available(&self) -> bool {
        self.0.0.value.get().metrics.is_some()
    }
    #[wasm_bindgen(getter)]
    pub fn width(&self) -> f64 {
        self.0.0.value.get().metrics.map_or(0.0, |v| v.width)
    }
    #[wasm_bindgen(getter)]
    pub fn height(&self) -> f64 {
        self.0.0.value.get().metrics.map_or(0.0, |v| v.height)
    }
    #[wasm_bindgen(getter)]
    pub fn backing(&self) -> f64 {
        self.0.0.value.get().metrics.map_or(1.0, |v| v.backing)
    }
    #[wasm_bindgen(getter, js_name = regionX)]
    pub fn region_x(&self) -> i64 {
        0
    }
    #[wasm_bindgen(getter, js_name = regionY)]
    pub fn region_y(&self) -> i64 {
        0
    }
    #[wasm_bindgen(getter, js_name = localX)]
    pub fn local_x(&self) -> f64 {
        0.0
    }
    #[wasm_bindgen(getter, js_name = localY)]
    pub fn local_y(&self) -> f64 {
        0.0
    }
    #[wasm_bindgen(getter)]
    pub fn zoom(&self) -> f64 {
        1.0
    }
}
