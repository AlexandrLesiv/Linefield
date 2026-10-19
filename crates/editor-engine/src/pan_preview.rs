use crate::numerics::{Axis, Viewport, coefficients};
use crate::{Code, Engine, Metrics, Phase};
#[derive(Clone, Copy)]
pub(crate) struct PanOrigin {
    pub owner: u64,
    pub session: u64,
    pub mapping: u64,
    pub content: u64,
    pub metrics: Metrics,
    pub viewport: Viewport,
}
#[derive(Clone, Copy, Default)]
pub struct PanPreview {
    pub mapping: u64,
    pub active: bool,
    pub outside: bool,
    pub affine: [f64; 6],
}
fn delta(before: Axis, after: Axis) -> Option<f64> {
    let regions = i128::from(before.region) - i128::from(after.region);
    if regions.abs() > 5 {
        return None;
    }
    Some(regions as f64 * 65536.0 + before.local - after.local)
}
fn affine(origin: PanOrigin, view: Viewport) -> Option<[f64; 6]> {
    let metrics = origin.metrics;
    let x = delta(origin.viewport.x, view.x)?;
    let y = delta(origin.viewport.y, view.y)?;
    let [c, s] = coefficients(view.rotation);
    let [oc, os] = coefficients(origin.viewport.rotation);
    let d = oc * oc + os * os;
    let (a, b) = if view.rotation == origin.viewport.rotation {
        (1.0, 0.0)
    } else {
        ((c * oc + s * os) / d, (s * oc - c * os) / d)
    };
    let scale = view.zoom * metrics.backing;
    let hx = metrics.width * metrics.backing / 2.0;
    let hy = metrics.height * metrics.backing / 2.0;
    let result = [
        a,
        -b,
        b,
        a,
        hx - a * hx + b * hy + (c * x - s * y) * scale,
        hy - b * hx - a * hy + (s * x + c * y) * scale,
    ];
    result.iter().all(|v| v.is_finite()).then_some(result)
}
fn outside(m: [f64; 6], metrics: Metrics) -> bool {
    let width = (metrics.width * metrics.backing).ceil();
    let height = (metrics.height * metrics.backing).ceil();
    let corners = [[0.0, 0.0], [width, 0.0], [0.0, height], [width, height]];
    let x = corners.map(|[x, y]| m[0] * x + m[1] * y + m[4]);
    let y = corners.map(|[x, y]| m[2] * x + m[3] * y + m[5]);
    x.iter().all(|v| *v < 0.0)
        || x.iter().all(|v| *v > width)
        || y.iter().all(|v| *v < 0.0)
        || y.iter().all(|v| *v > height)
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
        let transform = affine(origin, state.viewport);
        Ok(PanPreview {
            mapping: origin.mapping,
            active: self.document.pan.is_some(),
            outside: transform.is_none_or(|m| outside(m, origin.metrics)),
            affine: transform.unwrap_or([1.0, 0.0, 0.0, 1.0, 0.0, 0.0]),
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
                mapping: state.mapping,
                content: state.content,
                metrics,
                viewport: state.viewport,
            });
        }
    }
}
