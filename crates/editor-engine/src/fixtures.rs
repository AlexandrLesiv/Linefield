use crate::{Code, Engine};
impl Engine {
    /// Fault setup only: preserve an active interaction while exhausting its counters.
    pub fn fixture_terminal_reserve(&mut self) -> Code {
        if !self.document.busy() {
            return Code::Unavailable;
        }
        self.mapping_counter = u64::MAX - 3;
        self.presentation_counter = u64::MAX - 3;
        self.scene_counter = u64::MAX - 3;
        if let Some(v) = self.current.as_mut() {
            v.mapping = self.mapping_counter;
            v.presentation = self.presentation_counter;
            v.scene = self.scene_counter;
        }
        Code::Ok
    }
    /// Fault setup only: test local input at a far regional camera without global flattening.
    pub fn fixture_far_view(&mut self, region: i64, local: f64) -> Code {
        if self.current.is_some() || !local.is_finite() || !(0.0..65536.0).contains(&local) {
            return Code::Invalid;
        }
        self.document.view.center = [crate::numerics::Axis { region, local }; 2];
        Code::Ok
    }
}
