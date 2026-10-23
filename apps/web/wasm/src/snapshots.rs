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
                self.0.0.value.get().interaction
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
                self.0.0.value.get().active_cancelled
            }
        }
    };
}
snapshot!(PreparationSnapshot);
snapshot!(TailDisplaySnapshot);
snapshot!(CurrentCoverageSnapshot);
snapshot!(LiveFrameSnapshot);
snapshot!(DisplayFrameSnapshot);
snapshot!(VisibilitySnapshot);
snapshot!(Reply);
snapshot!(State);
snapshot!(Mapping);
snapshot!(SceneIds);
snapshot!(StrokeSnapshot);
snapshot!(GeometryPage);
snapshot!(PlacementSnapshot);
#[wasm_bindgen]
impl SceneIds {
    #[wasm_bindgen(getter)]
    pub fn ids(&self) -> Result<Box<[u64]>, JsValue> {
        if self.0.0.consumed.replace(true) {
            return Err(JsValue::from_str("snapshot-consumed"));
        }
        Ok(std::mem::take(&mut *self.0.0.ids.borrow_mut()).into_boxed_slice())
    }
    #[wasm_bindgen(getter)]
    pub fn done(&self) -> bool {
        self.0.0.count.get() < 256
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
        self.0.0.value.get().view.center[0].region
    }
    #[wasm_bindgen(getter, js_name = regionY)]
    pub fn region_y(&self) -> i64 {
        self.0.0.value.get().view.center[1].region
    }
    #[wasm_bindgen(getter, js_name = localX)]
    pub fn local_x(&self) -> f64 {
        self.0.0.value.get().view.center[0].local
    }
    #[wasm_bindgen(getter, js_name = localY)]
    pub fn local_y(&self) -> f64 {
        self.0.0.value.get().view.center[1].local
    }
    #[wasm_bindgen(getter)]
    pub fn zoom(&self) -> f64 {
        self.0.0.value.get().view.zoom
    }
    #[wasm_bindgen(getter)]
    pub fn angle(&self) -> f64 {
        self.0.0.value.get().view.angle
    }
}
