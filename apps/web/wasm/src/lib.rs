//! Checked Wasm adapter. Every caller-controlled argument remains a JsValue until validated.
#![forbid(unsafe_code)]
mod boundary;
mod exports;
mod mapping;
mod snapshots;
mod state;
pub use exports::*;
pub use mapping::*;
pub use snapshots::{Mapping, Reply, SceneIds, State};
use wasm_bindgen::prelude::*;
#[wasm_bindgen(typescript_custom_section)]
const TYPES: &str = r#"
export type Code = "ok" | "noop" | "invalid" | "stale-owner" | "stale-session"
  | "stale-mapping" | "stale-scene" | "sequence" | "active" | "unavailable"
  | "disposed" | "exhausted";
export type Phase = "gallery" | "ready" | "suspended";
"#;
