use crate::Engine;
impl Engine {
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
