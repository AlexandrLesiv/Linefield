//! Pure curve policy. No editor, host, allocation, or GPU ownership.
#![forbid(unsafe_code)]
mod curve;
mod flatten;
pub use curve::{Curve, Point, span};
pub use flatten::Flatten;
