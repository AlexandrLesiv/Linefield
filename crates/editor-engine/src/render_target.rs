use crate::pan_preview::{PanOrigin, affine, outside};
use crate::{Code, Engine, GeometryPage, PanPreview, Phase};
#[derive(Clone, Copy)]
pub(crate) struct Target {
    pub id: u64,
    pub origin: PanOrigin,
}
#[derive(Clone, Copy, Default)]
pub struct RenderTarget {
    pub id: u64,
    pub backing: f64,
    pub can_adopt: bool,
    pub preview: PanPreview,
}
impl Engine {
    fn target(&self, owner: u64, session: u64, target: u64) -> Result<Target, Code> {
        self.session(owner, session)?;
        let value = self
            .render_target
            .filter(|v| v.id == target)
            .ok_or(Code::StaleScene)?;
        let state = self.projection(Code::Ok);
        let origin = value.origin;
        if origin.owner != owner
            || origin.session != session
            || origin.content != state.content
            || state.phase != Phase::Ready
            || state.metrics != Some(origin.metrics)
            || state.viewport.zoom != origin.viewport.zoom
            || state.viewport.rotation != origin.viewport.rotation
            || self.document.active.is_some()
        {
            return Err(Code::StaleScene);
        }
        Ok(value)
    }
    pub fn render_capture(
        &mut self,
        owner: u64,
        session: u64,
        mapping: u64,
    ) -> Result<RenderTarget, Code> {
        self.mapping(owner, session, mapping)?;
        let state = self.projection(Code::Ok);
        if state.phase != Phase::Ready
            || self.document.active.is_some()
            || self.pan_origin.is_none()
        {
            return Err(Code::Unavailable);
        }
        if let Some(old) = self.render_target
            && self.target(owner, session, old.id).is_ok()
        {
            return Err(Code::Active);
        }
        let id = self.render_counter.checked_add(1).ok_or(Code::Exhausted)?;
        let metrics = state.metrics.ok_or(Code::Unavailable)?;
        self.render_counter = id;
        self.render_target = Some(Target {
            id,
            origin: PanOrigin {
                owner,
                session,
                mapping,
                content: state.content,
                metrics,
                viewport: state.viewport,
            },
        });
        self.render_transform(owner, session, id, mapping)
    }
    pub fn render_release(&mut self, owner: u64, session: u64, target: u64) -> Code {
        if let Err(code) = self.session(owner, session) {
            return code;
        }
        if self.render_target.is_some_and(|v| v.id == target) {
            self.render_target = None;
            Code::Ok
        } else {
            Code::StaleScene
        }
    }
    pub fn render_transform(
        &self,
        owner: u64,
        session: u64,
        target: u64,
        mapping: u64,
    ) -> Result<RenderTarget, Code> {
        self.mapping(owner, session, mapping)?;
        let value = self.target(owner, session, target)?;
        let current = self.projection(Code::Ok);
        let m = affine(value.origin, current.viewport);
        let can_adopt = if value.origin.mapping == mapping {
            true
        } else {
            self.pan_origin
                .and_then(|source| affine(source, current.viewport))
                .zip(m)
                .is_some_and(|(old, next)| {
                    crate::render_coverage::covers(old, next, value.origin.metrics)
                })
        };
        Ok(RenderTarget {
            id: target,
            backing: value.origin.metrics.backing,
            can_adopt,
            preview: PanPreview {
                mapping: value.origin.mapping,
                active: self.document.pan.is_some(),
                outside: m.is_none_or(|v| outside(v, value.origin.metrics)),
                affine: m.unwrap_or([1.0, 0.0, 0.0, 1.0, 0.0, 0.0]),
            },
        })
    }
    pub fn render_adopt(
        &mut self,
        owner: u64,
        session: u64,
        target: u64,
        mapping: u64,
        presentation: u64,
    ) -> Code {
        let plan = match self.render_transform(owner, session, target, mapping) {
            Ok(plan) => plan,
            Err(code) => return code,
        };
        if self.projection(Code::Ok).presentation != presentation {
            return Code::StaleScene;
        }
        if !plan.can_adopt {
            return Code::Unavailable;
        }
        self.pan_origin = self.render_target.map(|v| v.origin);
        self.render_target = None;
        Code::Ok
    }
    pub fn render_ids(
        &self,
        owner: u64,
        session: u64,
        target: u64,
        after: u64,
    ) -> Result<(Vec<u64>, bool), Code> {
        self.target(owner, session, target)?;
        self.visible_ids(owner, session, self.projection(Code::Ok).scene, after)
    }
    pub fn render_stroke(
        &self,
        owner: u64,
        session: u64,
        target: u64,
        stroke: u64,
    ) -> Result<(u64, u64, bool), Code> {
        self.target(owner, session, target)?;
        let selected = self.stroke(stroke).ok_or(Code::StaleScene)?;
        Ok((target, selected.verbs, true))
    }
    pub fn render_page(
        &self,
        owner: u64,
        session: u64,
        target: u64,
        stroke: u64,
        geometry: u64,
        offset: u64,
    ) -> Result<GeometryPage, Code> {
        let value = self.target(owner, session, target)?;
        if geometry != target {
            return Err(Code::StaleScene);
        }
        self.geometry_page(
            stroke,
            geometry,
            offset,
            value.origin.viewport,
            value.origin.metrics,
        )
    }
}
