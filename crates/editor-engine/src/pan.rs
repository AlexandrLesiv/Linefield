use crate::numerics::{Viewport, unproject};
use crate::{Code, Engine, Phase};
#[derive(Clone, Copy)]
pub(crate) struct Pan {
    pub interaction: u64,
    pub base_mapping: u64,
    pub _pointer: u64,
    pub next: u64,
    pub start: [f64; 2],
    pub before: Viewport,
}
impl Engine {
    pub(crate) fn view_ready(&self, owner: u64, session: u64, mapping: u64) -> Result<(), Code> {
        self.mapping(owner, session, mapping)?;
        if self.document.busy() {
            return Err(Code::Active);
        }
        let state = self.projection(Code::Ok);
        if state.phase != Phase::Ready || !state.mapping_ready || state.metrics.is_none() {
            return Err(Code::Unavailable);
        }
        Ok(())
    }
    pub fn pan_begin(
        &mut self,
        owner: u64,
        session: u64,
        mapping: u64,
        pointer: f64,
        point: [f64; 2],
    ) -> Code {
        let result = (|| {
            self.mapping(owner, session, mapping)?;
            if self.document.busy() {
                return Err(Code::Active);
            }
            if self.pan_preview(owner, session, mapping).is_err() {
                self.view_ready(owner, session, mapping)?;
            }
            if !pointer.is_finite()
                || pointer.fract() != 0.0
                || !(0.0..=9007199254740991.0).contains(&pointer)
                || point.iter().any(|v| !v.is_finite() || v.abs() > 16384.0)
            {
                return Err(Code::Invalid);
            }
            if !self.room(4) || self.interaction_counter == u64::MAX {
                return Err(Code::Exhausted);
            }
            self.interaction_counter += 1;
            self.remember_pan_origin();
            self.document.pan = Some(Pan {
                interaction: self.interaction_counter,
                base_mapping: mapping,
                _pointer: pointer as u64,
                next: 1,
                start: point,
                before: self.document.viewport,
            });
            self.scene_changed();
            Ok(())
        })();
        result.map_or_else(|code| code, |()| Code::Ok)
    }
    pub fn pan_identity(
        &self,
        owner: u64,
        session: u64,
        interaction: u64,
        base: u64,
    ) -> Result<(), Code> {
        self.session(owner, session)?;
        let pan = self.document.pan.ok_or(Code::StaleInteraction)?;
        if pan.interaction != interaction {
            return Err(Code::StaleInteraction);
        }
        if pan.base_mapping != base {
            return Err(Code::StaleMapping);
        }
        Ok(())
    }
    pub fn pan_update(
        &mut self,
        owner: u64,
        session: u64,
        interaction: u64,
        base: u64,
        sequence: u64,
        point: [f64; 2],
    ) -> Code {
        if let Err(code) = self.pan_identity(owner, session, interaction, base) {
            return code;
        }
        let result = (|| {
            let pan = self.document.pan.ok_or(Code::StaleInteraction)?;
            if sequence != pan.next {
                return Err(Code::Sequence);
            }
            if !self.room(4) || sequence == u64::MAX {
                return Err(Code::Exhausted);
            }
            let [x, y] = unproject(pan.before, pan.start, point, 16384)?;
            let next = Viewport { x, y, ..pan.before };
            self.document.viewport = next;
            if let Some(value) = self.document.pan.as_mut() {
                value.next += 1;
            }
            self.advance();
            Ok(())
        })();
        result.map_or_else(|code| self.cancel_current(code), |()| Code::Ok)
    }
    pub fn pan_end(
        &mut self,
        owner: u64,
        session: u64,
        interaction: u64,
        base: u64,
        next: u64,
    ) -> Code {
        if let Err(code) = self.pan_identity(owner, session, interaction, base) {
            return code;
        }
        if self.document.pan.is_none_or(|v| v.next != next) {
            return self.cancel_current(Code::Sequence);
        }
        self.document.pan = None;
        self.scene_changed();
        Code::Ok
    }
}
