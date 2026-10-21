use crate::{Code, Engine, Metrics, Phase};
impl Metrics {
    pub fn valid(self) -> bool {
        let width = (self.width * self.backing).ceil();
        let height = (self.height * self.backing).ceil();
        self.width.is_finite()
            && self.height.is_finite()
            && self.backing.is_finite()
            && (1.0..=8192.0).contains(&self.width)
            && (1.0..=8192.0).contains(&self.height)
            && (1.0..=4.0).contains(&self.backing)
            && width <= 8192.0
            && height <= 8192.0
            && width * height <= 8_388_608.0
    }
}
impl Engine {
    fn order(&self, owner: u64, session: u64, mapping: u64, sequence: u64) -> Result<(), Code> {
        self.mapping(owner, session, mapping)?;
        if sequence == 0 || sequence <= self.sequence {
            Err(Code::Sequence)
        } else {
            Ok(())
        }
    }
    pub fn metrics(
        &mut self,
        owner: u64,
        session: u64,
        mapping: u64,
        sequence: u64,
        metrics: Metrics,
    ) -> Code {
        if let Err(code) = self.order(owner, session, mapping, sequence) {
            return code;
        }
        if !metrics.valid() {
            return Code::Invalid;
        }
        if sequence == u64::MAX {
            self.suspend(owner, session, mapping, sequence);
            return Code::Exhausted;
        }
        if self
            .current
            .is_some_and(|v| v.metrics == Some(metrics) && v.phase == Phase::Ready)
        {
            self.sequence = sequence;
            return Code::Noop;
        }
        if !self.room(3 + u64::from(self.document.busy())) {
            // Cancellation, suspension and departure each retain their terminal generation.
            self.cancel_current(Code::Ok);
            if self.current.is_some_and(|v| v.phase != Phase::Suspended) {
                self.advance();
                if let Some(value) = self.current.as_mut() {
                    value.phase = Phase::Suspended;
                    value.metrics = None;
                }
            }
            return Code::Exhausted;
        }
        self.cancel_current(Code::Ok);
        self.advance();
        self.sequence = sequence;
        if let Some(value) = self.current.as_mut() {
            value.phase = Phase::Ready;
            value.metrics = Some(metrics);
        }
        Code::Ok
    }
    pub fn suspend(&mut self, owner: u64, session: u64, mapping: u64, sequence: u64) -> Code {
        if let Err(code) = self.order(owner, session, mapping, sequence) {
            return code;
        }
        self.sequence = sequence;
        if self.current.is_some_and(|v| v.phase == Phase::Suspended) {
            return Code::Noop;
        }
        self.cancel_current(Code::Ok);
        self.advance();
        if let Some(value) = self.current.as_mut() {
            value.phase = Phase::Suspended;
            value.metrics = None;
        }
        Code::Ok
    }
}
