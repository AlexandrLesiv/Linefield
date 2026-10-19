use crate::{Code, Engine};
#[derive(Clone, Copy)]
pub enum RotationDirection {
    Left,
    Right,
    Reset,
}
impl Engine {
    pub fn rotate_step(
        &mut self,
        owner: u64,
        session: u64,
        mapping: u64,
        direction: RotationDirection,
    ) -> Code {
        let result = (|| {
            self.mapping(owner, session, mapping)?;
            if self.document.busy() {
                return Err(Code::Active);
            }
            if self.pan_preview(owner, session, mapping).is_err() {
                self.view_ready(owner, session, mapping)?;
            }
            let before = self.document.viewport.rotation;
            let next = match direction {
                RotationDirection::Left => (before + 23) % 24,
                RotationDirection::Right => (before + 1) % 24,
                RotationDirection::Reset => 0,
            };
            if next == before {
                return Ok(Code::Noop);
            }
            if !self.room(3) {
                return Err(Code::Exhausted);
            }
            self.remember_pan_origin();
            self.document.viewport.rotation = next;
            self.advance();
            Ok(Code::Ok)
        })();
        result.unwrap_or_else(|code| code)
    }
}
