use crate::Engine;
impl Engine {
    pub fn fixture_rotated_boundary() -> Self {
        let mut value = Self::default();
        value.document.viewport.x = crate::numerics::Axis {
            region: i64::MAX,
            local: 32768.0,
        };
        value.document.viewport.y = crate::numerics::Axis {
            region: i64::MIN,
            local: 32768.0,
        };
        value.document.viewport.rotation = 3;
        value.document.viewport.zoom = 0.1;
        value
    }
    pub fn fixture_far_view(&mut self) {
        self.document.viewport.x.region = i64::MIN;
        self.document.viewport.y.region = i64::MAX;
        self.pan_origin = None;
        self.advance();
    }
    pub fn fixture_near_exhaustion() -> Self {
        Self::fixture_counters(4)
    }
    pub fn fixture_near_pan_exhaustion() -> Self {
        Self::fixture_counters(7)
    }
    fn fixture_counters(remaining: u64) -> Self {
        Self {
            mapping_counter: u64::MAX - remaining,
            presentation_counter: u64::MAX - remaining,
            scene_counter: u64::MAX - remaining,
            ..Self::default()
        }
    }
}
