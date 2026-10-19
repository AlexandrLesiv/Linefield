use crate::{Code, Engine};
impl Engine {
    pub fn settings(&mut self, owner: u64, session: u64, width: f64, color: [f64; 3]) -> Code {
        if let Err(code) = self.session(owner, session) {
            return code;
        }
        if self.document.busy() {
            return Code::Active;
        }
        if !width.is_finite()
            || !(1.0..=512.0).contains(&width)
            || color
                .iter()
                .any(|v| !v.is_finite() || !(0.0..=1.0).contains(v))
        {
            return Code::Invalid;
        }
        self.document.width = width;
        self.document.color = color;
        Code::Ok
    }
}
