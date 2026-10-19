use crate::ink::{Active, Stroke};
use crate::{Code, Engine, Input, Phase};
impl Engine {
    pub fn begin(
        &mut self,
        owner: u64,
        session: u64,
        mapping: u64,
        pointer: f64,
        input: Input,
    ) -> Code {
        let result = (|| {
            self.mapping(owner, session, mapping)?;
            if self.document.active.is_some() {
                return Err(Code::Active);
            }
            if !pointer.is_finite()
                || pointer.fract() != 0.0
                || !(0.0..=9007199254740991.0).contains(&pointer)
            {
                return Err(Code::Invalid);
            }
            let state = self.projection(Code::Ok);
            if state.phase != Phase::Ready || !state.presented {
                return Err(Code::Unavailable);
            }
            if !self.room(4)
                || self.interaction_counter == u64::MAX
                || self.stroke_counter == u64::MAX
                || self.content_counter == u64::MAX
            {
                return Err(Code::Exhausted);
            }
            let sample = self
                .document
                .sample(input, state.metrics.ok_or(Code::Unavailable)?)?;
            let mut samples = Vec::new();
            samples.try_reserve(1).map_err(|_| Code::Capacity)?;
            self.document
                .strokes
                .try_reserve(1)
                .map_err(|_| Code::Capacity)?;
            self.interaction_counter += 1;
            self.stroke_counter += 1;
            let mut stroke = Stroke {
                id: self.stroke_counter,
                samples,
                color: self.document.color,
                min: [sample.x, sample.y],
                max: [sample.x, sample.y],
                verbs: 0,
            };
            stroke.push(sample)?;
            self.document.active = Some(Active {
                _pointer: pointer as u64,
                interaction: self.interaction_counter,
                stroke,
            });
            self.scene_changed();
            Ok(())
        })();
        result.map_or_else(|code| code, |()| Code::Ok)
    }
    pub fn interaction(
        &self,
        owner: u64,
        session: u64,
        interaction: u64,
        mapping: u64,
    ) -> Result<(), Code> {
        self.mapping(owner, session, mapping)?;
        if self
            .document
            .active
            .as_ref()
            .is_some_and(|v| v.interaction == interaction)
        {
            Ok(())
        } else {
            Err(Code::StaleInteraction)
        }
    }
    pub fn append(
        &mut self,
        owner: u64,
        session: u64,
        interaction: u64,
        mapping: u64,
        first: u64,
        inputs: &[Input],
    ) -> Code {
        if let Err(code) = self.interaction(owner, session, interaction, mapping) {
            return code;
        }
        let result = (|| {
            let active = self
                .document
                .active
                .as_ref()
                .ok_or(Code::StaleInteraction)?;
            if first != active.stroke.samples.len() as u64 {
                return Err(Code::Sequence);
            }
            if inputs.is_empty() || inputs.len() > 256 {
                return Err(Code::Invalid);
            }
            if !self.room(4)
                || active
                    .stroke
                    .verbs
                    .checked_add(inputs.len() as u64 * 11)
                    .is_none()
            {
                return Err(Code::Exhausted);
            }
            let metrics = self.projection(Code::Ok).metrics.ok_or(Code::Unavailable)?;
            let mut checked = Vec::new();
            checked
                .try_reserve_exact(inputs.len())
                .map_err(|_| Code::Capacity)?;
            for input in inputs {
                checked.push(self.document.sample(*input, metrics)?);
            }
            let active = self
                .document
                .active
                .as_mut()
                .ok_or(Code::StaleInteraction)?;
            active
                .stroke
                .samples
                .try_reserve(checked.len())
                .map_err(|_| Code::Capacity)?;
            for sample in checked {
                active.stroke.push(sample)?;
            }
            self.scene_changed();
            Ok(())
        })();
        match result {
            Ok(()) => Code::Ok,
            Err(code) => self.cancel_current(code),
        }
    }
    pub fn cancel(&mut self, owner: u64, session: u64, interaction: u64, capacity: bool) -> Code {
        if let Err(code) = self.session(owner, session) {
            return code;
        }
        if !self
            .document
            .active
            .as_ref()
            .is_some_and(|v| v.interaction == interaction)
        {
            return Code::StaleInteraction;
        }
        self.cancel_current(if capacity { Code::Capacity } else { Code::Ok })
    }
    pub fn cancel_current(&mut self, code: Code) -> Code {
        if self.document.active.take().is_some() {
            self.active_cancelled = true;
            self.scene_changed();
        }
        if code == Code::Exhausted {
            self.advance();
            if let Some(value) = self.current.as_mut() {
                value.phase = Phase::Suspended;
                value.metrics = None;
            }
        }
        code
    }
    pub(crate) fn cancel_for_mapping(&mut self) {
        if self.document.active.take().is_some() {
            self.active_cancelled = true;
        }
    }
    pub fn reset_outcome(&mut self) {
        self.active_cancelled = false;
    }
    pub(crate) fn scene_changed(&mut self) {
        self.scene_counter += 1;
        if let Some(value) = self.current.as_mut() {
            value.scene = self.scene_counter;
        }
    }
}
