use crate::{
    Metrics,
    numerics::{Viewport, raster_offset::offset, raster_residual::residual},
    raster_capture::RasterCapture,
};
#[derive(Default)]
pub(crate) struct RasterState {
    pub capture: RasterCapture,
    saved: Option<RasterCapture>,
    start: [f64; 2],
    metrics: Option<Metrics>,
    counter: u64,
    failed: bool,
}
impl RasterState {
    pub fn reset(&mut self, view: Viewport, metrics: Option<Metrics>) {
        self.saved = None;
        self.failed = false;
        self.metrics = metrics;
        let epoch = self.counter.checked_add(1);
        self.counter = epoch.unwrap_or(self.counter);
        self.capture = RasterCapture {
            anchor: view,
            epoch: if metrics.is_some() {
                epoch.unwrap_or(0)
            } else {
                0
            },
            offset: [0; 2],
        };
    }
    pub fn begin(&mut self, view: Viewport, metrics: Metrics, start: [f64; 2]) {
        if self.metrics != Some(metrics) || !self.capture.anchored() {
            self.reset(view, Some(metrics));
        }
        self.saved = Some(self.capture);
        self.start = start;
        self.failed = false;
    }
    pub fn update(&mut self, current: [f64; 2], view: Viewport) {
        self.capture = RasterCapture::canonical(view);
        if self.failed {
            return;
        }
        let (Some(saved), Some(m)) = (self.saved, self.metrics) else {
            return;
        };
        let values = [0, 1].map(|i| offset(self.start[i], current[i], m.backing, saved.offset[i]));
        match values {
            [Ok(x), Ok(y)] if saved.anchored() => {
                if residual(saved.anchor, view, m, [x, y]).is_ok() {
                    self.capture = RasterCapture {
                        offset: [x, y],
                        ..saved
                    };
                } else {
                    self.failed = true;
                }
            }
            errors => {
                self.failed = errors.iter().any(|v| {
                    matches!(
                        v,
                        Err(crate::numerics::raster_offset::Outcome::Range
                            | crate::numerics::raster_offset::Outcome::Uncertified)
                    )
                });
            }
        }
    }
    pub fn terminal(&mut self, view: Viewport, cancel: bool) {
        if cancel {
            if let Some(saved) = self.saved.take() {
                self.capture = saved;
            }
        } else if !self.capture.anchored() || self.failed {
            self.reset(view, self.metrics);
        }
        self.saved = None;
        self.failed = false;
    }
}
