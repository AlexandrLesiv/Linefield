use crate::{Code, Engine};
impl Engine {
    pub fn display_ready(&mut self, owner: u64, session: u64, mapping: u64, receipt: u64) -> Code {
        if let Err(c) = self.mapping(owner, session, mapping) {
            return c;
        }
        let frame = match self.frame_receipt(owner, session, receipt) {
            Ok(f) => f,
            Err(c) => return c,
        };
        let Some(value) = self.current.as_mut() else {
            return Code::StaleSession;
        };
        // frame_receipt checks the exact monotonic last stroke identity, not just count.
        // Equal-count Undo/rebranch cannot acknowledge a previous branch's pixels.
        if frame.count != self.document.visible
            || frame.content != self.content_counter
            || frame.mapping != mapping
            || frame.view != self.document.view
            || value.metrics != Some(frame.metrics)
        {
            return Code::StaleScene;
        }
        if value.display_usable {
            return Code::Noop;
        }
        value.display_usable = true;
        Code::Ok
    }
}
