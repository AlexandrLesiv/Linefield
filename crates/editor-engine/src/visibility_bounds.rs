use crate::{Engine, FrameReceipt, Stroke, numerics::Axis};
use linefield_editor_geometry::{bounds, intersects, span};

#[derive(Clone, Copy, Default)]
pub(crate) struct Hull {
    pub anchor: [Axis; 2],
    pub bounds: [f64; 4],
    pub known: bool,
}
impl Hull {
    pub fn chunk(source: &Stroke, chunk: usize) -> Self {
        let Some(start) = chunk.checked_mul(128) else {
            return Self::default();
        };
        let end = start.saturating_add(128).min(source.samples.len);
        let Some(first) = source.samples.get(start) else {
            return Self::default();
        };
        let anchor = first.position;
        let mut hull = [
            f64::INFINITY,
            f64::INFINITY,
            f64::NEG_INFINITY,
            f64::NEG_INFINITY,
        ];
        let point = |i| {
            let p = source.samples.get(i)?;
            Some([
                p.position[0].relative(anchor[0]).ok()?,
                p.position[1].relative(anchor[1]).ok()?,
                source.style.radius(p),
            ])
        };
        for i in start..end {
            let Some(p) = point(i) else {
                return Self::default();
            };
            let curve = if i == 0 {
                [p; 4]
            } else {
                let Some(previous) = point(i - 1) else {
                    return Self::default();
                };
                let before = i.checked_sub(2).and_then(point);
                let after = (i + 1 < source.samples.len).then(|| point(i + 1)).flatten();
                if (i >= 2 && before.is_none()) || (i + 1 < source.samples.len && after.is_none()) {
                    return Self::default();
                }
                span(before, previous, p, after)
            };
            let b = bounds(&curve);
            for k in 0..2 {
                hull[k] = hull[k].min(b[k]);
                hull[k + 2] = hull[k + 2].max(b[k + 2]);
            }
        }
        Self {
            anchor,
            bounds: hull,
            known: hull.iter().all(|v| v.is_finite()),
        }
    }
    pub fn union(self, other: Self) -> Self {
        if !self.known || !other.known {
            return Self::default();
        }
        let mut result = self;
        for k in 0..2 {
            let Ok(delta) = other.anchor[k].relative(self.anchor[k]) else {
                return Self::default();
            };
            let low = other.bounds[k] + delta;
            let high = other.bounds[k + 2] + delta;
            let error = (other.bounds[k].abs().max(other.bounds[k + 2].abs()) + delta.abs() + 1.0)
                * f64::EPSILON
                * 8.0;
            result.bounds[k] = result.bounds[k].min((low - error).next_down());
            result.bounds[k + 2] = result.bounds[k + 2].max((high + error).next_up());
        }
        result.known = result.bounds.iter().all(|v| v.is_finite());
        result
    }
    pub fn visible(self, frame: FrameReceipt) -> bool {
        if !self.known {
            return true;
        }
        match Engine::coverage_bounds(
            frame.view,
            frame.metrics,
            self.anchor,
            2.0 / (frame.view.zoom * frame.metrics.backing),
        ) {
            Ok(view) => intersects(self.bounds, view),
            // A hierarchy may span arbitrarily distant regions. Failed conversion is
            // not an invisibility certificate, even when a leaf could be clipped later.
            Err(_) => true,
        }
    }
}
