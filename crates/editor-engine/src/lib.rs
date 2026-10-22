//! Portable, single-owner empty editor lifecycle. No storage or rendering dependency.
#![forbid(unsafe_code)]
mod camera;
mod document;
#[cfg(feature = "e2e-fixtures")]
mod fixtures;
mod geometry_cursor;
mod geometry_packing;
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

mod preparation;
mod preparation_adopt;
pub use preparation::PreparationInput;

mod preparation_relevance;

mod display_readiness;
mod frame;
pub use frame::FrameReceipt;

mod coverage;
mod live_preparation;
mod preparation_view;

mod preparation_range;

mod source_proof;
mod tail_display;
mod tail_placement;
mod tail_preparation;
pub use tail_display::TailStatus;
