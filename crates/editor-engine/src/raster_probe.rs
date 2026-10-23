//! Isolated feasibility state. Never consulted by production pan, receipts or rendering.
use crate::numerics::raster_offset::{Outcome, offset};
use crate::{FrameReceipt, Metrics, numerics::Viewport};

#[derive(Clone, Copy, Default)]
pub struct RasterCapture {
    pub anchor: Viewport,
    pub epoch: u64,
    pub offset: [i32; 2],
    pub enabled: bool,
}
#[derive(Default)]
pub struct RasterProbe {
    pub capture: RasterCapture,
    pub outcome: Outcome,
    saved: Option<RasterCapture>,
    start: [f64; 2],
    last: Viewport,
    identity: (u64, u64),
    metrics: Option<Metrics>,
    counter: u64,
    failed: bool,
}
impl RasterProbe {
    fn anchor(&mut self, view: Viewport) {
        let epoch = self.counter.checked_add(1);
        self.counter = epoch.unwrap_or(self.counter);
        self.capture = RasterCapture {
            anchor: view,
            epoch: epoch.unwrap_or(0),
            offset: [0; 2],
            enabled: epoch.is_some(),
        };
        self.outcome = if epoch.is_some() {
            Outcome::Integral
        } else {
            Outcome::Uncertified
        };
        self.last = view;
    }
    pub fn begin(
        &mut self,
        owner: u64,
        session: u64,
        view: Viewport,
        metrics: Metrics,
        start: [f64; 2],
    ) {
        if self.identity != (owner, session) || self.metrics != Some(metrics) || self.last != view {
            self.anchor(view);
        }
        self.identity = (owner, session);
        self.metrics = Some(metrics);
        self.saved = Some(self.capture);
        self.start = start;
        self.failed = false;
    }
    pub fn update(&mut self, current: [f64; 2], view: Viewport) {
        self.last = view;
        if self.failed {
            return;
        }
        let (Some(saved), Some(metrics)) = (self.saved, self.metrics) else {
            return;
        };
        if !saved.enabled {
            self.outcome = Outcome::Uncertified;
            self.failed = true;
            return;
        }
        let axes =
            [0, 1].map(|i| offset(self.start[i], current[i], metrics.backing, saved.offset[i]));
        self.capture.enabled = false;
        self.outcome = axes
            .iter()
            .filter_map(|v| v.as_ref().err().copied())
            .find(|v| *v != Outcome::Fractional)
            .or_else(|| axes.iter().find_map(|v| v.as_ref().err().copied()))
            .unwrap_or(Outcome::Integral);
        if let [Ok(x), Ok(y)] = axes {
            self.capture.offset = [x, y];
            self.capture.enabled = true;
        }
        self.failed = matches!(self.outcome, Outcome::Range | Outcome::Uncertified);
    }
    pub fn terminal(&mut self, view: Viewport, cancel: bool) {
        if cancel {
            if let Some(saved) = self.saved {
                self.capture = saved;
            }
            self.outcome = if self.capture.enabled {
                Outcome::Integral
            } else {
                Outcome::Uncertified
            };
        } else if !self.capture.enabled || self.failed {
            self.anchor(view);
        }
        self.last = view;
        self.saved = None;
        self.failed = false;
    }
}
// The production receipt now embeds its raster capture; measure the actual layout.
type ProposedFrame = FrameReceipt;
type ProposedTail = crate::tail_display::TailDisplay;
pub fn layouts() -> [usize; 5] {
    [
        size_of::<RasterCapture>(),
        size_of::<Option<ProposedFrame>>(),
        size_of::<Option<ProposedTail>>(),
        size_of::<[Option<ProposedFrame>; 8]>() + size_of::<[Option<ProposedTail>; 2]>(),
        size_of::<RasterProbe>(),
    ]
}
const _: () = assert!(size_of::<Option<ProposedFrame>>() <= 256);
const _: () = assert!(size_of::<Option<ProposedTail>>() <= 512);
const _: () = assert!(
    size_of::<[Option<ProposedFrame>; 8]>() + size_of::<[Option<ProposedTail>; 2]>() <= 3072
);
