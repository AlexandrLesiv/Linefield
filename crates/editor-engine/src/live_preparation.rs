use crate::{Code, Engine, PreparationInput, source_proof::SourceProof};
impl Engine {
    pub fn stable_preparation(
        &mut self,
        owner: u64,
        session: u64,
        scene: u64,
        stroke: u64,
        from: u64,
        detail: f64,
    ) -> Result<PreparationInput, Code> {
        let m = self
            .current
            .and_then(|s| s.metrics)
            .ok_or(Code::Unavailable)?;
        self.live_range(
            owner,
            session,
            scene,
            stroke,
            from,
            detail,
            self.document.view,
            m,
            false,
        )
    }
    #[expect(clippy::too_many_arguments, reason = "named frame stable source query")]
    pub fn frame_stable_preparation(
        &mut self,
        owner: u64,
        session: u64,
        scene: u64,
        stroke: u64,
        from: u64,
        detail: f64,
        frame: u64,
    ) -> Result<PreparationInput, Code> {
        let f = self.live_frame_receipt(owner, session, frame, stroke)?;
        self.live_range(
            owner, session, scene, stroke, from, detail, f.view, f.metrics, false,
        )
    }
    #[expect(clippy::too_many_arguments, reason = "named exact tail source query")]
    pub fn frame_tail_preparation(
        &mut self,
        owner: u64,
        session: u64,
        scene: u64,
        stroke: u64,
        from: u64,
        detail: f64,
        frame: u64,
    ) -> Result<PreparationInput, Code> {
        let f = self.live_frame_receipt(owner, session, frame, stroke)?;
        self.live_range(
            owner, session, scene, stroke, from, detail, f.view, f.metrics, true,
        )
    }
    #[expect(clippy::too_many_arguments, reason = "shared bounded source issuance")]
    fn live_range(
        &mut self,
        owner: u64,
        session: u64,
        scene: u64,
        stroke: u64,
        from: u64,
        detail: f64,
        v: crate::numerics::Viewport,
        m: crate::Metrics,
        tail: bool,
    ) -> Result<PreparationInput, Code> {
        let (count, _, active) = self.stroke_info(owner, session, scene, stroke)?;
        if !detail.is_finite() || !(0.01..=128.0).contains(&detail) || detail < v.zoom * m.backing {
            return Err(Code::Invalid);
        }
        let limit = if active && !tail {
            count.saturating_sub(1) / 128 * 128
        } else {
            count
        };
        if from > count {
            return Err(Code::Invalid);
        }
        if from >= limit {
            return Ok(PreparationInput {
                token: 0,
                points: Vec::new(),
                first: 0,
                end: 0,
                detail,
                clip: None,
                through: from,
            });
        }
        let through = from.saturating_add(128).min(limit);
        let minimum = through + u64::from(active && !tail);
        let proof = if tail {
            SourceProof::Exact(count)
        } else {
            SourceProof::Prefix(minimum)
        };
        self.prepare_range(
            stroke,
            from,
            if tail { count } else { minimum },
            detail,
            v,
            m,
            from as usize,
            through as usize,
            proof,
        )
    }
    pub fn live_placement(
        &self,
        owner: u64,
        session: u64,
        frame: u64,
        stroke: u64,
        page: u64,
    ) -> Result<crate::Placement, Code> {
        let f = self.live_frame_receipt(owner, session, frame, stroke)?;
        self.project_page(stroke, page, f.view, f.metrics)
    }
    pub fn append_frame(
        &mut self,
        owner: u64,
        session: u64,
        frame: u64,
        stroke: u64,
    ) -> Result<crate::FrameReceipt, Code> {
        let f = self.frame_receipt(owner, session, frame)?;
        if f.count >= self.document.visible || self.document.strokes[f.count].id != stroke {
            return Err(Code::StaleScene);
        }
        if self.receipt_count() >= 8 {
            return Err(Code::Capacity);
        }
        let id = self.frame_counter.checked_add(1).ok_or(Code::Exhausted)?;
        let next = crate::FrameReceipt {
            id,
            through: stroke,
            count: f.count + 1,
            content: if f.count + 1 == self.document.visible {
                self.content_counter
            } else {
                0
            },
            ..f
        };
        self.insert_frame(next)
    }
}
