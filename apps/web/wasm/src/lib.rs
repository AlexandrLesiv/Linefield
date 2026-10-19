//! Checked Wasm adapter. Every caller-controlled argument remains a JsValue until validated.
#![forbid(unsafe_code)]
mod arrays;
mod boundary;
mod exports;
mod history;
mod ink;
mod mapping;
mod pan;
mod pan_preview;
mod scene;
mod scene_state;
mod snapshots;
mod state;
mod view_steps;
pub use exports::*;
pub use history::*;
pub use ink::*;
pub use mapping::*;
pub use pan::*;
pub use pan_preview::*;
pub use scene::*;
pub use snapshots::{Mapping, PanPreview, Reply, SceneIds, ScenePage, State, StrokeState};
pub use view_steps::*;
use wasm_bindgen::prelude::*;
#[wasm_bindgen(typescript_custom_section)]
const TYPES: &str = r#"
export type Code = "ok" | "noop" | "invalid" | "stale-owner" | "stale-session"
  | "stale-mapping" | "stale-scene" | "sequence" | "active" | "unavailable"
  | "disposed" | "exhausted" | "capacity" | "stale-interaction" | "coordinate-overflow" | "numerical-capacity";
export type Phase = "gallery" | "ready" | "suspended";
"#;
