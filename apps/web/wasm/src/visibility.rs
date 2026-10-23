use crate::{
    boundary::{execute_query, id},
    snapshots::VisibilitySnapshot,
};
use linefield_editor_engine::Code;
use wasm_bindgen::prelude::*;

#[wasm_bindgen(js_name=memoryFrameVisibility,unchecked_return_type="VisibilitySnapshot")]
pub fn visibility(
    #[wasm_bindgen(unchecked_param_type = "bigint")] owner: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] session: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] scene: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] frame: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] predecessor: JsValue,
    #[wasm_bindgen(unchecked_param_type = "bigint")] cursor: JsValue,
) -> Result<JsValue, JsValue> {
    execute_query::<VisibilitySnapshot>(|engine, data| {
        match (|| {
            engine.frame_visibility(
                id(owner)?,
                id(session)?,
                id(scene)?,
                id(frame)?,
                id(predecessor)?,
                id(cursor)?,
            )
        })() {
            Ok(page) => {
                *data.visibility.borrow_mut() = Some(page);
                Code::Ok
            }
            Err(code) => code,
        }
    })
}
#[wasm_bindgen]
impl VisibilitySnapshot {
    #[wasm_bindgen(getter)]
    pub fn strokes(&self) -> Result<Box<[u64]>, JsValue> {
        self.take_values(1)
    }
    #[wasm_bindgen(getter)]
    pub fn chunks(&self) -> Result<Box<[u64]>, JsValue> {
        self.take_values(2)
    }
    #[wasm_bindgen(getter)]
    pub fn revisions(&self) -> Result<Box<[u64]>, JsValue> {
        self.take_values(4)
    }
    #[wasm_bindgen(getter)]
    pub fn next(&self) -> u64 {
        self.0.0.visibility.borrow().as_ref().map_or(0, |v| v.next)
    }
    #[wasm_bindgen(getter)]
    pub fn done(&self) -> bool {
        self.0.0.visibility.borrow().as_ref().is_none_or(|v| v.done)
    }
    #[wasm_bindgen(getter,js_name=visitedNodes)]
    pub fn visited_nodes(&self) -> usize {
        self.0
            .0
            .visibility
            .borrow()
            .as_ref()
            .map_or(0, |v| v.visited)
    }
    #[wasm_bindgen(getter,js_name=constructedHulls)]
    pub fn constructed_hulls(&self) -> usize {
        self.0.0.visibility.borrow().as_ref().map_or(0, |v| v.hulls)
    }
    #[wasm_bindgen(getter,js_name=indexBytes)]
    pub fn index_bytes(&self) -> usize {
        self.0
            .0
            .visibility
            .borrow()
            .as_ref()
            .map_or(0, |v| v.index_bytes)
    }
    #[wasm_bindgen(getter,js_name=cursorBytes)]
    pub fn cursor_bytes(&self) -> usize {
        self.0
            .0
            .visibility
            .borrow()
            .as_ref()
            .map_or(0, |v| v.cursor_bytes)
    }
    #[wasm_bindgen(getter,js_name=replyBytes)]
    pub fn reply_bytes(&self) -> usize {
        self.0
            .0
            .visibility
            .borrow()
            .as_ref()
            .map_or(0, |v| v.reply_bytes)
    }
}
impl VisibilitySnapshot {
    fn take_values(&self, field: u8) -> Result<Box<[u64]>, JsValue> {
        let previous = self.0.0.visibility_consumed.get();
        if previous & field != 0 {
            return Err(JsValue::from_str("snapshot-consumed"));
        }
        self.0.0.visibility_consumed.set(previous | field);
        let mut page = self.0.0.visibility.borrow_mut();
        let Some(page) = page.as_mut() else {
            return Ok(Box::default());
        };
        let values = match field {
            1 => &mut page.strokes,
            2 => &mut page.chunks,
            _ => &mut page.revisions,
        };
        Ok(std::mem::take(values).into_boxed_slice())
    }
}
