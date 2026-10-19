//! Portable, single-owner empty editor lifecycle. No storage or rendering dependency.
#![forbid(unsafe_code)]
mod drawing;
mod geometry;
mod history;
mod ink;
mod lifecycle;
mod mapping;
mod model;
mod numerics;
mod settings;
pub use model::{Code, Engine, Metrics, Phase, Projection};

pub use geometry::GeometryPage;
pub use ink::{Input, Sample};
