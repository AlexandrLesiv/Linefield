use crate::{Code, Engine};
impl Engine {
    pub fn reset_view(&mut self, owner: u64, session: u64, mapping: u64) -> Code {
        if let Err(c) = self.ready(owner, session, mapping) {
            return c;
        }
        if self.document.busy() {
            return Code::Active;
        }
        if self.document.view == Default::default() {
            return Code::Noop;
        }
        self.document.view = Default::default();
        self.raster
            .reset(self.document.view, self.current.and_then(|v| v.metrics));
        self.advance();
        Code::Ok
    }
}
