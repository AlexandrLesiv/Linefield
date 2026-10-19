use crate::{Code, Engine, Phase};
impl Engine {
    pub fn create(&mut self) -> Code {
        if self.current.is_some() {
            return Code::Active;
        }
        if self.owner_counter == u64::MAX || self.content_counter == u64::MAX {
            return Code::Exhausted;
        }
        self.owner_counter += 1;
        self.content_counter += 1;
        let mut value = self.projection(Code::Ok);
        value.owner = self.owner_counter;
        value.content = self.content_counter;
        self.current = Some(value);
        Code::Ok
    }
    pub fn enter(&mut self, owner: u64) -> Code {
        if let Err(code) = self.owner(owner) {
            return code;
        }
        if self.current.is_some_and(|v| v.session != 0) {
            return Code::Noop;
        }
        // Keep two terminal generations for suspension followed by departure.
        if self.session_counter == u64::MAX || !self.room(3) {
            return Code::Exhausted;
        }
        self.session_counter += 1;
        self.advance();
        self.sequence = 0;
        if let Some(value) = self.current.as_mut() {
            value.session = self.session_counter;
            value.phase = Phase::Suspended;
            value.metrics = None;
        }
        Code::Ok
    }
    pub fn leave(&mut self, owner: u64, session: u64) -> Code {
        if let Err(code) = self.session(owner, session) {
            return code;
        }
        // Enter/update admission reserves this generation; cleanup cannot consume it early.
        self.cancel_for_mapping();
        self.advance();
        if let Some(value) = self.current.as_mut() {
            value.session = 0;
            value.phase = Phase::Gallery;
            value.metrics = None;
        }
        self.sequence = 0;
        Code::Ok
    }
    pub fn dispose(&mut self, owner: u64) -> Code {
        if let Err(code) = self.owner(owner) {
            return code;
        }
        self.document = Default::default();
        self.current = None;
        self.disposed = owner;
        self.sequence = 0;
        Code::Ok
    }
    pub fn presented(
        &mut self,
        owner: u64,
        session: u64,
        presentation: u64,
        mapping: u64,
        content: u64,
    ) -> Code {
        if let Err(code) = self.mapping(owner, session, mapping) {
            return code;
        }
        let Some(value) = self.current.as_mut() else {
            return Code::StaleOwner;
        };
        if value.presentation != presentation || value.content != content {
            return Code::StaleScene;
        }
        if value.phase != Phase::Ready || value.metrics.is_none() {
            return Code::Unavailable;
        }
        if value.presented {
            return Code::Noop;
        }
        value.presented = true;
        Code::Ok
    }
    pub fn scene_ids(&self, owner: u64, session: u64, scene: u64, after: u64) -> Code {
        if let Err(code) = self.session(owner, session) {
            return code;
        }
        if self.current.is_some_and(|v| v.scene != scene) {
            return Code::StaleScene;
        }
        if after != 0 {
            return Code::Invalid;
        }
        Code::Ok
    }
}
