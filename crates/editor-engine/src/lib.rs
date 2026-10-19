//! Portable, single-owner empty editor lifecycle. No storage or rendering dependency.
#![forbid(unsafe_code)]
mod lifecycle;
mod mapping;
mod model;
pub use model::{Code, Engine, Metrics, Phase, Projection};
