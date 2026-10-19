//! Portable, single-owner empty editor lifecycle. No storage or rendering dependency.
#![forbid(unsafe_code)]
mod drawing;
#[cfg(feature = "e2e-fixtures")]
mod fixtures;
mod geometry;
mod history;
mod ink;
mod lifecycle;
mod mapping;
mod model;
mod numerics;
mod pan;
mod pan_preview;
mod rotation;
mod settings;
mod view_steps;
pub use model::{Code, Engine, Metrics, Phase, Projection};

pub use geometry::GeometryPage;
pub use ink::{Input, Sample};
pub use pan_preview::PanPreview;
pub use rotation::RotationDirection;
pub use view_steps::PanDirection;
