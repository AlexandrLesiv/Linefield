use crate::{Code, Engine, document::Gesture};
fn angle(v: f64) -> f64 {
    let value = (v + std::f64::consts::PI).rem_euclid(std::f64::consts::TAU) - std::f64::consts::PI;
    if value == 0.0 { 0.0 } else { value }
}
impl Engine {
    #[expect(
        clippy::too_many_arguments,
        reason = "MIG-C1 named typed command/query parameters"
    )]
    pub fn pan_begin(
        &mut self,
        owner: u64,
        session: u64,
        mapping: u64,
        _pointer: u64,
        x: f64,
        y: f64,
        rotate: bool,
    ) -> Code {
        if let Err(c) = self.ready(owner, session, mapping) {
            return c;
        }
        if self.document.busy() {
            return Code::Active;
        }
        if !x.is_finite() || !y.is_finite() || x.abs() > 16384.0 || y.abs() > 16384.0 {
            return Code::Invalid;
        }
        if !rotate && let Some(m) = self.current.and_then(|v| v.metrics) {
            self.raster.begin(self.document.view, m, [x, y]);
        }
        self.interaction_counter += 1;
        self.document.gesture = Some(Gesture {
            id: self.interaction_counter,
            _pointer,
            mapping,
            sequence: 0,
            base: self.document.view,
            start: [x, y],
            rotate,
        });
        Code::Ok
    }
    #[expect(
        clippy::too_many_arguments,
        reason = "MIG-C1 named typed command/query parameters"
    )]
    pub fn pan_update(
        &mut self,
        owner: u64,
        session: u64,
        id: u64,
        mapping: u64,
        sequence: u64,
        x: f64,
        y: f64,
        snap: bool,
    ) -> Code {
        if let Err(c) = self.interaction(owner, session, id, mapping) {
            return c;
        }
        if self.document.active.is_some() {
            return Code::Active;
        }
        let Some(mut g) = self.document.gesture else {
            return Code::StaleInteraction;
        };
        if sequence <= g.sequence {
            return Code::Sequence;
        }
        if !self.room(4) {
            return self.cancel_current(Code::Exhausted);
        }
        let mut next = g.base;
        if g.rotate {
            let Some(m) = self.current.and_then(|v| v.metrics) else {
                return Code::Unavailable;
            };
            if !x.is_finite() || !y.is_finite() {
                return Code::Invalid;
            }
            let start = (g.start[1] - m.height / 2.0).atan2(g.start[0] - m.width / 2.0);
            let now = (y - m.height / 2.0).atan2(x - m.width / 2.0);
            let mut v = g.base.angle + now - start;
            if snap {
                v = (v / (std::f64::consts::PI / 12.0)).round() * (std::f64::consts::PI / 12.0);
            }
            next.angle = angle(v);
        } else {
            match g.base.inverse(g.start, [x, y]) {
                Ok(p) => next.center = p,
                Err(c) => return self.cancel_current(c),
            }
        }
        self.document.view = next;
        if g.rotate {
            self.raster
                .reset(next, self.current.and_then(|v| v.metrics));
        } else {
            self.raster.update([x, y], next);
        }
        g.sequence = sequence;
        self.document.gesture = Some(g);
        self.advance();
        Code::Ok
    }
    pub fn pan_end(
        &mut self,
        owner: u64,
        session: u64,
        id: u64,
        mapping: u64,
        sequence: u64,
    ) -> Code {
        if let Err(c) = self.interaction(owner, session, id, mapping) {
            return c;
        }
        if self.document.active.is_some() {
            return Code::Active;
        }
        if self.document.gesture.is_none_or(|g| g.sequence != sequence) {
            return self.cancel_current(Code::Sequence);
        }
        self.raster.terminal(self.document.view, false);
        self.document.gesture = None;
        Code::Ok
    }
    #[expect(
        clippy::too_many_arguments,
        reason = "MIG-C1 named typed command/query parameters"
    )]
    pub fn view_at(
        &mut self,
        owner: u64,
        session: u64,
        mapping: u64,
        value: f64,
        x: f64,
        y: f64,
        rotate: bool,
        snap: bool,
    ) -> Code {
        if let Err(c) = self.ready(owner, session, mapping) {
            return c;
        }
        if self.document.busy() {
            return Code::Active;
        }
        if !value.is_finite() || (!rotate && !(0.05..=16.0).contains(&value)) {
            return Code::Invalid;
        }
        let Some(m) = self.current.and_then(|v| v.metrics) else {
            return Code::Unavailable;
        };
        let world = match self
            .document
            .view
            .inverse([x, y], [m.width / 2.0, m.height / 2.0])
        {
            Ok(v) => v,
            Err(c) => return c,
        };
        let mut next = self.document.view;
        next.center = world;
        if rotate {
            next.angle = angle(if snap {
                (value / (std::f64::consts::PI / 12.0)).round() * (std::f64::consts::PI / 12.0)
            } else {
                value
            });
        } else {
            next.zoom = value;
        }
        next.center = match next.inverse([m.width / 2.0, m.height / 2.0], [x, y]) {
            Ok(v) => v,
            Err(c) => return c,
        };
        self.document.view = next;
        self.raster.reset(next, Some(m));
        self.advance();
        Code::Ok
    }
}
