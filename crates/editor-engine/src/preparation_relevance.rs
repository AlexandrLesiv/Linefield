use crate::{Code, Engine};
impl Engine {
    pub fn release_preparation(&mut self, owner: u64, session: u64, token: u64) -> Code {
        if let Err(c) = self.session(owner, session) {
            return c;
        }
        self.preparations.retain(|t| t.token != token);
        Code::Ok
    }
    pub fn preparation_current(&self, owner: u64, session: u64, token: u64) -> Result<(), Code> {
        self.session(owner, session)?;
        let t = self
            .preparations
            .iter()
            .find(|v| v.token == token)
            .ok_or(Code::StaleScene)?;
        let source = self.document.stroke(t.key.stroke).ok_or(Code::StaleScene)?;
        if !t.proof.current(source.samples.len as u64, t.key) {
            return Err(Code::StaleScene);
        }
        Ok(())
    }
    pub fn preparation_coverage(&self, owner: u64, session: u64, token: u64) -> Result<bool, Code> {
        self.preparation_current(owner, session, token)?;
        let t = self
            .preparations
            .iter()
            .find(|t| t.token == token)
            .ok_or(Code::StaleScene)?;
        if !t.complete {
            return Ok(false);
        }
        let m = self
            .current
            .and_then(|s| s.metrics)
            .ok_or(Code::Unavailable)?;
        if t.key.detail < self.document.view.zoom * m.backing {
            return Ok(false);
        }
        if let Some(b) = t.clip {
            let v = self.view_bounds(t.anchor, 2.0 / t.key.detail)?;
            return Ok(v[0] >= b[0] && v[1] >= b[1] && v[2] <= b[2] && v[3] <= b[3]);
        }
        Ok(true)
    }
    pub fn complete_preparation(
        &mut self,
        owner: u64,
        session: u64,
        token: u64,
        ordinal: u64,
    ) -> Code {
        if let Err(c) = self.preparation_current(owner, session, token) {
            return c;
        }
        let Some(t) = self.preparations.iter_mut().find(|t| t.token == token) else {
            return Code::StaleScene;
        };
        if t.ordinal != ordinal || t.complete {
            return Code::Sequence;
        }
        t.complete = true;
        Code::Ok
    }
}
