//! Portable, single-owner empty editor lifecycle. No storage or rendering dependency.
#![forbid(unsafe_code)]
mod camera;
mod document;
#[cfg(feature = "e2e-fixtures")]
mod fixtures;
mod geometry_cursor;
mod geometry_page;
mod geometry_precision;
mod history;
mod ink;
mod lifecycle;
mod mapping;
mod model;
pub mod numerics;
mod resources;
mod scene;
pub use document::{RawSample, Samples, Stroke, Style};
pub use ink::Input;
pub use model::{Code, Engine, Metrics, Phase, Projection};
pub use resources::Resources;
pub use scene::{Page, Placement};
