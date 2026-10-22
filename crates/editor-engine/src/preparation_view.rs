use crate::{Code, Engine, PreparationInput};
impl Engine {
    #[expect(clippy::too_many_arguments, reason = "MIG-C1 named preparation query")]
    pub fn preparation(
        &mut self,
        owner: u64,
        session: u64,
        scene: u64,
        stroke: u64,
        chunk: u64,
        revision: u64,
        detail: f64,
    ) -> Result<PreparationInput, Code> {
        let m = self
            .current
            .and_then(|s| s.metrics)
            .ok_or(Code::Unavailable)?;
        self.preparation_at(
            owner,
            session,
            scene,
            stroke,
            chunk,
            revision,
            detail,
            self.document.view,
            m,
        )
    }
    #[expect(
        clippy::too_many_arguments,
        reason = "MIG-C1 named frame preparation query"
    )]
    pub fn frame_preparation(
        &mut self,
        owner: u64,
        session: u64,
        scene: u64,
        stroke: u64,
        chunk: u64,
        revision: u64,
        detail: f64,
        frame: u64,
    ) -> Result<PreparationInput, Code> {
        let f = self.frame_receipt(owner, session, frame)?;
        self.preparation_at(
            owner, session, scene, stroke, chunk, revision, detail, f.view, f.metrics,
        )
    }
    pub fn frame_preparation_coverage(
        &self,
        owner: u64,
        session: u64,
        token: u64,
        frame: u64,
    ) -> Result<bool, Code> {
        self.preparation_current(owner, session, token)?;
        let f = self.frame_receipt(owner, session, frame)?;
        let t = self
            .preparations
            .iter()
            .find(|t| t.token == token)
            .ok_or(Code::StaleScene)?;
        if !t.complete || t.key.detail < f.view.zoom * f.metrics.backing {
            return Ok(false);
        }
        if let Some(b) = t.clip {
            let v = Self::coverage_bounds(f.view, f.metrics, t.anchor, 2.0 / t.key.detail)?;
            return Ok(v[0] >= b[0] && v[1] >= b[1] && v[2] <= b[2] && v[3] <= b[3]);
        }
        Ok(true)
    }
}
