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
#[cfg(feature = "e2e-fixtures")]
pub mod raster_probe;
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
pub use frame::{FrameAuthority, FrameReceipt};
mod frame_capture;
mod frame_registry;
mod frame_reuse;
pub use frame_capture::FrameCapture;
pub use frame_reuse::{FrameReuse, FrameReuseMiss};
mod current_coverage;
pub use current_coverage::{CurrentCoverage, LiveState};

mod coverage;
mod live_preparation;
mod preparation_view;

mod preparation_range;

mod source_proof;
mod tail_display;
mod tail_placement;
mod tail_preparation;
pub use tail_display::TailStatus;
mod visibility;
mod visibility_allocation;
mod visibility_bounds;
mod visibility_cache;
mod visibility_cursor;
mod visibility_range;
mod visibility_walk;
pub use visibility_cursor::VisibilityPage;

mod frame_pan_reuse;
mod raster_capture;
mod raster_placement;
mod raster_state;
pub use frame_pan_reuse::{FramePanReuse, PanReuseMiss};
pub use raster_placement::{PlacementDisposition, RasterMiss};

mod camera_reset;

mod raster_quad;
