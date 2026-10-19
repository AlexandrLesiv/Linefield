use crate::{Code, Engine};
impl Engine {
    pub fn end(
        &mut self,
        owner: u64,
        session: u64,
        interaction: u64,
        mapping: u64,
        next: u64,
    ) -> Code {
        if let Err(code) = self.interaction(owner, session, interaction, mapping) {
            return code;
        }
        if self
            .document
            .active
            .as_ref()
            .is_none_or(|v| v.stroke.samples.len() as u64 != next)
        {
            return self.cancel_current(Code::Sequence);
        }
        let Some(active) = self.document.active.take() else {
            return Code::StaleInteraction;
        };
        self.document.strokes.truncate(self.document.visible);
        self.document.strokes.push(active.stroke);
        self.document.visible += 1;
        let mut retained: usize = self.document.strokes[self.document.retired..]
            .iter()
            .map(|v| v.charge())
            .sum();
        while retained > 16 * 1024 * 1024 && self.document.retired + 1 < self.document.visible {
            retained -= self.document.strokes[self.document.retired].charge();
            self.document.retired += 1;
        }
        self.content_changed();
        Code::Ok
    }
    pub fn undo(&mut self, owner: u64, session: u64, redo: bool) -> Code {
        if let Err(code) = self.session(owner, session) {
            return code;
        }
        if self.document.busy() {
            return Code::Active;
        }
        if !self.room(3) || self.content_counter == u64::MAX {
            return Code::Exhausted;
        }
        if redo {
            if self.document.visible == self.document.strokes.len() {
                return Code::Noop;
            }
            self.document.visible += 1;
        } else {
            if self.document.visible == self.document.retired {
                return Code::Noop;
            }
            self.document.visible -= 1;
        }
        self.content_changed();
        Code::Ok
    }
    fn content_changed(&mut self) {
        self.pan_origin = None;
        self.content_counter += 1;
        self.presentation_counter += 1;
        self.scene_changed();
        if let Some(value) = self.current.as_mut() {
            value.content = self.content_counter;
            value.presentation = self.presentation_counter;
            value.presented = false;
        }
    }
}
