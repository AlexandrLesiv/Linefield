//! Checked Wasm adapter. Every caller-controlled argument remains a JsValue until validated.
#![forbid(unsafe_code)]
mod arrays;
mod boundary;
mod camera;
mod commands;
mod exports;
#[cfg(feature = "e2e-fixtures")]
mod fixtures;
mod geometry_results;
mod ink;
mod mapping;
mod queries;
mod snapshots;
mod state;
pub use camera::*;
pub use commands::*;
pub use exports::*;
pub use ink::*;
pub use mapping::*;
pub use queries::*;
pub use snapshots::{Mapping, Reply, SceneIds, State};
use wasm_bindgen::prelude::*;
#[wasm_bindgen(typescript_custom_section)]
const TYPES: &str = r#"
export type Code = "ok" | "noop" | "invalid" | "stale-owner" | "stale-session"
  | "stale-mapping" | "stale-scene" | "sequence" | "active" | "unavailable"
  | "disposed" | "exhausted" | "capacity" | "coordinate-overflow" | "numerical-capacity" | "stale-interaction";
export type Phase = "gallery" | "ready" | "suspended";
"#;

mod preparation;

mod preparation_status;

mod coverage_snapshot;
mod current_coverage;
mod display_readiness;
mod frame;
mod frame_capture;
mod frame_preparation;
mod frame_reuse;
mod live_preparation;
mod stable_preparation;
mod tail_display;
mod tail_pages;
mod tail_preparation;
mod visibility;
