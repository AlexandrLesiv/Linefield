use crate::boundary::{execute, execute_data, id};
use crate::snapshots::{Mapping, Reply, SceneIds, State};
use linefield_editor_engine::{Code, Engine};
use wasm_bindgen::prelude::*;
#[wasm_bindgen(js_name = memoryCreate, unchecked_return_type = "Reply")]
pub fn memory_create() -> Result<JsValue, JsValue> {
    execute::<Reply>(Engine::create)
}
#[wasm_bindgen(js_name = memoryEnter, unchecked_return_type = "Reply")]
pub fn memory_enter(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
) -> Result<JsValue, JsValue> {
    execute::<Reply>(|engine| id(owner).map_or_else(|code| code, |owner| engine.enter(owner)))
}
#[wasm_bindgen(js_name = memoryRead, unchecked_return_type = "State")]
pub fn memory_read(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
) -> Result<JsValue, JsValue> {
    execute::<State>(|engine| {
        id(owner)
            .and_then(|owner| engine.owner(owner))
            .map_or_else(|code| code, |()| Code::Ok)
    })
}
#[wasm_bindgen(js_name = memoryMapping, unchecked_return_type = "Mapping")]
pub fn memory_mapping(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
) -> Result<JsValue, JsValue> {
    execute::<Mapping>(|engine| {
        (|| engine.session(id(owner)?, id(session)?))().map_or_else(|code| code, |()| Code::Ok)
    })
}
#[wasm_bindgen(js_name = memoryLeave, unchecked_return_type = "Reply")]
pub fn memory_leave(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
) -> Result<JsValue, JsValue> {
    execute::<Reply>(|engine| {
        (|| Ok(engine.leave(id(owner)?, id(session)?)))().unwrap_or_else(|code| code)
    })
}
#[wasm_bindgen(js_name = memoryDispose, unchecked_return_type = "Reply")]
pub fn memory_dispose(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
) -> Result<JsValue, JsValue> {
    execute::<Reply>(|engine| id(owner).map_or_else(|code| code, |owner| engine.dispose(owner)))
}
#[wasm_bindgen(js_name = memorySceneIds, unchecked_return_type = "SceneIds")]
pub fn memory_scene_ids(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] scene: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] after: JsValue,
) -> Result<JsValue, JsValue> {
    execute_data::<SceneIds>(|engine, data| {
        match (|| engine.visible_ids(id(owner)?, id(session)?, id(scene)?, id(after)?))() {
            Ok((ids, done)) => {
                let mut payload = data.payload.borrow_mut();
                payload.ids = ids;
                payload.done = done;
                Code::Ok
            }
            Err(code) => code,
        }
    })
}
