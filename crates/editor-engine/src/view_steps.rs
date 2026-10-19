use crate::numerics::unproject;
use crate::{Code, Engine};
#[derive(Clone, Copy)]
pub enum PanDirection {
    Left,
    Right,
    Up,
    Down,
}
impl Engine {
    pub fn pan_step(
        &mut self,
        owner: u64,
        session: u64,
        mapping: u64,
        direction: PanDirection,
    ) -> Code {
        let result = (|| {
            self.view_ready(owner, session, mapping)?;
            if !self.room(3) {
                return Err(Code::Exhausted);
            }
            let mut view = self.document.viewport;
            let delta = match direction {
                PanDirection::Left => [-40.0, 0.0],
                PanDirection::Right => [40.0, 0.0],
                PanDirection::Up => [0.0, -40.0],
                PanDirection::Down => [0.0, 40.0],
            };
            let [x, y] = unproject(view, delta, [0.0; 2], 40)?;
            view.x = x;
            view.y = y;
            self.document.viewport = view;
            self.pan_origin = None;
            self.advance();
            Ok(())
        })();
        result.map_or_else(|code| code, |()| Code::Ok)
    }
    pub fn zoom_step(&mut self, owner: u64, session: u64, mapping: u64, inward: bool) -> Code {
        if let Err(code) = self.view_ready(owner, session, mapping) {
            return code;
        }
        let zoom = self.document.viewport.zoom;
        let next = if inward {
            (zoom * 1.25).min(8.0)
        } else {
            (zoom / 1.25).max(0.1)
        };
        if next == zoom {
            return Code::Noop;
        }
        if !self.room(3) {
            return Code::Exhausted;
        }
        self.document.viewport.zoom = next;
        self.pan_origin = None;
        self.advance();
        Code::Ok
    }
}
