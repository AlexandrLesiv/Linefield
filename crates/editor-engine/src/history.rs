use crate::{Code, Engine};
impl Engine {
    pub fn end(&mut self, owner: u64, session: u64, id: u64, mapping: u64, next: u64) -> Code {
        if let Err(c) = self.interaction(owner, session, id, mapping) {
            return c;
        }
        if self
            .document
            .active
            .as_ref()
            .is_none_or(|s| s.samples.len as u64 != next)
        {
            return self.cancel_current(Code::Sequence);
        }
        let Some(stroke) = self.document.active.take() else {
            return Code::StaleInteraction;
        };
        self.document.strokes.truncate(self.document.visible);
        self.document.strokes.push(stroke);
        self.document.visible += 1;
        self.document.gesture = None;
        let mut retained: usize = self.document.strokes[self.document.retired..]
            .iter()
            .map(|s| s.samples.charge())
            .sum();
        while retained > 16 * 1024 * 1024 && self.document.retired + 1 < self.document.visible {
            retained -= self.document.strokes[self.document.retired]
                .samples
                .charge();
            self.document.retired += 1;
        }
        self.scene_changed(true);
        Code::Ok
    }
    pub fn cancel_current(&mut self, code: Code) -> Code {
        if let Some(g) = self.document.gesture.take() {
            if let Some(stroke) = self.document.active.take() {
                self.clear_stroke_tail_displays(stroke.id);
                self.scene_changed(false);
            } else {
                self.document.view = g.base;
                if g.rotate {
                    self.raster
                        .reset(g.base, self.current.and_then(|v| v.metrics));
                } else {
                    self.raster.terminal(g.base, true);
                }
                self.advance();
            }
            self.active_cancelled = true;
        }
        code
    }
    pub fn cancel(&mut self, owner: u64, session: u64, id: u64) -> Code {
        if let Err(c) = self.session(owner, session) {
            return c;
        }
        let Some(g) = self.document.gesture else {
            return Code::Noop;
        };
        if id != g.id {
            return Code::StaleInteraction;
        }
        self.cancel_current(Code::Ok)
    }
    pub fn undo(&mut self, owner: u64, session: u64, redo: bool) -> Code {
        if let Err(c) = self.session(owner, session) {
            return c;
        }
        if self.document.busy() {
            return Code::Active;
        }
        if !self.room(4) || self.content_counter == u64::MAX {
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
        self.clear_tail_displays();
        self.prune_visibility();
        self.scene_changed(true);
        Code::Ok
    }
}
