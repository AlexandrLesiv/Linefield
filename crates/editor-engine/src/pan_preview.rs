use crate::numerics::{Axis, Viewport};
use crate::{Code, Engine, Metrics, Phase};
#[derive(Clone, Copy)]
pub(crate) struct PanOrigin {
    pub owner: u64,
    pub session: u64,
    pub source: u64,
    pub mapping: u64,
    pub content: u64,
    pub metrics: Metrics,
    pub viewport: Viewport,
}
#[derive(Clone, Copy, Default)]
pub struct PanPreview {
    pub source: u64,
    pub mapping: u64,
    pub active: bool,
    pub outside: bool,
    pub offset: [f64; 2],
}
fn offset(before: Axis, after: Axis, scale: f64, extent: f64) -> Option<f64> {
    // Never flatten a regional coordinate. A remote source cannot overlap this raster.
    let regions = i128::from(before.region) - i128::from(after.region);
    if regions.abs() > 5 {
        return None;
    }
    let delta = (regions as f64 * 65536.0 + before.local - after.local) * scale;
    (delta.is_finite() && delta.abs() < extent).then_some(delta)
}
impl Engine {
    pub fn pan_preview(&self, owner: u64, session: u64, mapping: u64) -> Result<PanPreview, Code> {
        self.mapping(owner, session, mapping)?;
        let origin = self.pan_origin.ok_or(Code::Unavailable)?;
        let state = self.projection(Code::Ok);
        if origin.owner != owner
            || origin.session != session
            || origin.content != state.content
            || state.phase != Phase::Ready
            || state.metrics != Some(origin.metrics)
            || state.viewport.zoom != origin.viewport.zoom
            || self.document.active.is_some()
        {
            return Err(Code::Unavailable);
        }
        let metrics = origin.metrics;
        let scale = origin.viewport.zoom * metrics.backing;
        let x = offset(
            origin.viewport.x,
            state.viewport.x,
            scale,
            (metrics.width * metrics.backing).ceil(),
        );
        let y = offset(
            origin.viewport.y,
            state.viewport.y,
            scale,
            (metrics.height * metrics.backing).ceil(),
        );
        Ok(PanPreview {
            source: origin.source,
            mapping: origin.mapping,
            active: self.document.pan.is_some(),
            outside: x.is_none() || y.is_none(),
            offset: [x.unwrap_or(0.0), y.unwrap_or(0.0)],
        })
    }
    pub(crate) fn remember_pan_origin(&mut self) {
        if self.pan_origin.is_some() {
            return;
        }
        let state = self.projection(Code::Ok);
        if let Some(metrics) = state.metrics {
            self.pan_origin = Some(PanOrigin {
                owner: state.owner,
                session: state.session,
                source: self.interaction_counter,
                mapping: state.mapping,
                content: state.content,
                metrics,
                viewport: state.viewport,
            });
        }
    }
}
