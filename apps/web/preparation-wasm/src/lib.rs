//! Checked disposable preparation adapter; no Engine or document module is linked.
#![forbid(unsafe_code)]
mod arrays;
mod identity;
mod operations;
mod result;
mod state;
pub use identity::PreparationIdentity;
pub use operations::*;
pub use result::{PreparationReply, PreparedPage};
