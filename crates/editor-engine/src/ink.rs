use crate::document::Gesture;
use crate::{Code, Engine, Phase, RawSample, Samples, Stroke, Style};
#[derive(Clone, Copy, Debug, Default)]
pub struct Input {
    pub x: f64,
    pub y: f64,
    pub pressure: f64,
    pub present: bool,
}
impl Engine {
    pub(crate) fn scene_changed(&mut self, content: bool) {
        self.scene_counter += 1;
        self.presentation_counter += 1;
        if content {
            self.content_counter += 1;
        }
        if let Some(v) = self.current.as_mut() {
            v.scene = self.scene_counter;
            v.presentation = self.presentation_counter;
            v.content = self.content_counter;
            v.presented = false;
        }
    }
    pub(crate) fn ready(&self, owner: u64, session: u64, mapping: u64) -> Result<(), Code> {
        self.mapping(owner, session, mapping)?;
        if self
            .current
            .is_none_or(|v| v.phase != Phase::Ready || v.metrics.is_none())
        {
            return Err(Code::Unavailable);
        }
        if !self.room(4) || self.content_counter == u64::MAX || self.interaction_counter == u64::MAX
        {
            return Err(Code::Exhausted);
        }
        Ok(())
    }
    pub fn style(&mut self, owner: u64, session: u64, style: Style) -> Code {
        if let Err(c) = self.session(owner, session) {
            return c;
        }
        if self.document.busy() {
            return Code::Active;
        }
        if !style.valid() {
            return Code::Invalid;
        }
        self.document.style = style;
        Code::Ok
    }
    fn sample(&self, input: Input) -> Result<RawSample, Code> {
        if !input.pressure.is_finite()
            || !(0.0..=1.0).contains(&input.pressure)
            || (!input.present && input.pressure.to_bits() != 0)
        {
            return Err(Code::Invalid);
        }
        let metrics = self
            .current
            .and_then(|v| v.metrics)
            .ok_or(Code::Unavailable)?;
        Ok(RawSample {
            position: self.document.view.inverse(
                [input.x, input.y],
                [metrics.width / 2.0, metrics.height / 2.0],
            )?,
            pressure: input.pressure,
            present: input.present,
        })
    }
    pub fn begin(
        &mut self,
        owner: u64,
        session: u64,
        mapping: u64,
        _pointer: u64,
        input: Input,
    ) -> Code {
        if let Err(c) = self.ready(owner, session, mapping) {
            return c;
        }
        if self.document.busy() {
            return Code::Active;
        }
        if self.document.next_id == u64::MAX {
            return Code::Exhausted;
        }
        let sample = match self.sample(input) {
            Ok(s) => s,
            Err(c) => return c,
        };
        if self.document.strokes.try_reserve(1).is_err() {
            return Code::Capacity;
        }
        let mut samples = Samples::default();
        if let Err(c) = samples.append(&[sample]) {
            return c;
        }
        self.document.next_id += 1;
        self.interaction_counter += 1;
        self.document.active = Some(Stroke {
            id: self.document.next_id,
            samples,
            style: self.document.style,
        });
        self.document.gesture = Some(Gesture {
            id: self.interaction_counter,
            _pointer,
            mapping,
            sequence: 1,
            base: self.document.view,
            start: [input.x, input.y],
            rotate: false,
        });
        self.scene_changed(false);
        Code::Ok
    }
    pub fn interaction(&self, owner: u64, session: u64, id: u64, mapping: u64) -> Result<(), Code> {
        self.session(owner, session)?;
        let g = self.document.gesture.ok_or(Code::StaleInteraction)?;
        if id != g.id {
            return Err(Code::StaleInteraction);
        }
        if mapping != g.mapping {
            return Err(Code::StaleMapping);
        }
        Ok(())
    }
    pub fn append(
        &mut self,
        owner: u64,
        session: u64,
        id: u64,
        mapping: u64,
        first: u64,
        input: &[Input],
    ) -> Code {
        if let Err(c) = self.interaction(owner, session, id, mapping) {
            return c;
        }
        let Some(active) = self.document.active.as_ref() else {
            return Code::Active;
        };
        if first != active.samples.len as u64 {
            return self.cancel_current(Code::Sequence);
        }
        if input.is_empty() || input.len() > 256 {
            return self.cancel_current(Code::Invalid);
        }
        if !self.room(4) {
            return self.cancel_current(Code::Exhausted);
        }
        let mut samples = [RawSample::default(); 256];
        for (index, value) in input.iter().enumerate() {
            match self.sample(*value) {
                Ok(v) => samples[index] = v,
                Err(c) => return self.cancel_current(c),
            }
        }
        let result = self
            .document
            .active
            .as_mut()
            .ok_or(Code::StaleInteraction)
            .and_then(|s| s.samples.append(&samples[..input.len()]));
        if let Err(c) = result {
            return self.cancel_current(c);
        }
        self.scene_changed(false);
        Code::Ok
    }
}
