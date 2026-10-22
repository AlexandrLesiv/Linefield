//! Pure curve policy. No editor, host, allocation, or GPU ownership.
#![forbid(unsafe_code)]
mod bounds;
mod compact;
mod curve;
mod flatten;
mod preparation;
pub use bounds::{Bounds, bounds, intersects};
pub use curve::{Curve, Point, span};
pub use flatten::Flatten;
pub use preparation::{Preparation, PreparedPage};

mod preparation_page;
