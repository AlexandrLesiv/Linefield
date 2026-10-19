mod page;
mod primitives;
use crate::ink::Stroke;
use crate::{Code, Engine};
pub use page::GeometryPage;
pub(crate) use primitives::hull;
impl Engine {
    pub(crate) fn stroke(&self, id: u64) -> Option<&Stroke> {
        self.document.strokes[..self.document.visible]
            .iter()
            .find(|v| v.id == id)
            .or_else(|| {
                self.document
                    .active
                    .as_ref()
                    .map(|v| &v.stroke)
                    .filter(|v| v.id == id)
            })
    }
    pub fn stroke_state(
        &self,
        owner: u64,
        session: u64,
        scene: u64,
        stroke: u64,
    ) -> Result<(u64, u64, bool), Code> {
        self.session(owner, session)?;
        let state = self.projection(Code::Ok);
        if state.scene != scene {
            return Err(Code::StaleScene);
        }
        let selected = self.stroke(stroke).ok_or(Code::StaleScene)?;
        Ok((
            state.mapping,
            selected.verbs,
            !self
                .document
                .active
                .as_ref()
                .is_some_and(|v| v.stroke.id == stroke),
        ))
    }
    pub fn visible_ids(
        &self,
        owner: u64,
        session: u64,
        scene: u64,
        after: u64,
    ) -> Result<(Vec<u64>, bool), Code> {
        self.session(owner, session)?;
        if self.projection(Code::Ok).scene != scene {
            return Err(Code::StaleScene);
        }
        let mut ids = Vec::new();
        ids.try_reserve_exact(128).map_err(|_| Code::Capacity)?;
        let all = self.document.strokes[..self.document.visible]
            .iter()
            .map(|v| v.id)
            .chain(self.document.active.as_ref().map(|v| v.stroke.id));
        let mut seen = after == 0;
        let mut done = true;
        for id in all {
            if !seen {
                seen = id == after;
                continue;
            }
            if ids.len() == 128 {
                done = false;
                break;
            }
            ids.push(id);
        }
        if !seen {
            return Err(Code::Invalid);
        }
        Ok((ids, done))
    }
}
