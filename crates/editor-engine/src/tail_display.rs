use crate::{Code, Engine, FrameReceipt, Phase, Style, source_proof::SourceProof};
#[derive(Clone, Copy)]
pub(crate) struct TailDisplay {
    pub id: u64,
    pub stroke: u64,
    pub count: u64,
    pub from: u64,
    pub cursor: u64,
    pub pending: Option<(u64, u64)>,
    pub anchor: FrameReceipt,
    pub detail: f64,
    pub style: Style,
}
const _: () = assert!(size_of::<TailDisplay>() <= 512);
#[derive(Clone, Copy, Default)]
pub struct TailStatus {
    pub id: u64,
    pub stroke: u64,
    pub count: u64,
    pub from: u64,
    pub anchor: u64,
    pub complete: bool,
    pub exact_source: bool,
}
impl Engine {
    pub(crate) fn receipt_count(&self) -> usize {
        self.frames.iter().flatten().count() + self.tails.iter().flatten().count()
    }
    #[expect(
        clippy::too_many_arguments,
        reason = "named captured display source query"
    )]
    pub fn capture_tail_display(
        &mut self,
        owner: u64,
        session: u64,
        scene: u64,
        stroke: u64,
        anchor: u64,
        from: u64,
        detail: f64,
    ) -> Result<TailStatus, Code> {
        let (count, style, active) = self.stroke_info(owner, session, scene, stroke)?;
        let f = self.live_frame_receipt(owner, session, anchor, stroke)?;
        let m = self
            .current
            .and_then(|v| v.metrics)
            .ok_or(Code::Unavailable)?;
        if m != f.metrics {
            return Err(Code::StaleMapping);
        }
        let limit = if active {
            count.saturating_sub(1) / 128 * 128
        } else {
            count
        };
        if from > limit
            || (!from.is_multiple_of(128) && from != count)
            || !detail.is_finite()
            || !(0.01..=128.0).contains(&detail)
            || detail < f.view.zoom * f.metrics.backing
        {
            return Err(Code::Invalid);
        }
        if self
            .tails
            .iter()
            .flatten()
            .any(|t| t.stroke != stroke || t.anchor.id != anchor)
        {
            return Err(Code::Invalid);
        }
        if self.receipt_count() >= 8 {
            return Err(Code::Capacity);
        }
        let slot = self
            .tails
            .iter()
            .position(Option::is_none)
            .ok_or(Code::Capacity)?;
        let id = self.tail_counter.checked_add(1).ok_or(Code::Exhausted)?;
        self.tails[slot] = Some(TailDisplay {
            id,
            stroke,
            count,
            from,
            cursor: from,
            pending: None,
            anchor: f,
            detail,
            style,
        });
        self.tail_counter = id;
        self.tail_display_status(
            owner,
            session,
            self.current.ok_or(Code::Unavailable)?.mapping,
            id,
        )
    }
    pub(crate) fn tail_display(
        &self,
        owner: u64,
        session: u64,
        id: u64,
    ) -> Result<TailDisplay, Code> {
        self.session(owner, session)?;
        let current = self.current.ok_or(Code::Unavailable)?;
        if current.phase != Phase::Ready {
            return Err(Code::Unavailable);
        }
        let t = self
            .tails
            .iter()
            .flatten()
            .find(|t| t.id == id)
            .copied()
            .ok_or(Code::StaleScene)?;
        if current.metrics != Some(t.anchor.metrics) {
            return Err(Code::StaleMapping);
        }
        self.live_frame_receipt(owner, session, t.anchor.id, t.stroke)?;
        let source = self.document.stroke(t.stroke).ok_or(Code::StaleScene)?;
        if source.samples.len < t.count as usize || source.style != t.style {
            return Err(Code::StaleScene);
        }
        Ok(t)
    }
    pub fn tail_display_status(
        &self,
        owner: u64,
        session: u64,
        mapping: u64,
        id: u64,
    ) -> Result<TailStatus, Code> {
        self.mapping(owner, session, mapping)?;
        let t = self.tail_display(owner, session, id)?;
        let source = self.document.stroke(t.stroke).ok_or(Code::StaleScene)?;
        Ok(TailStatus {
            id,
            stroke: t.stroke,
            count: t.count,
            from: t.from,
            anchor: t.anchor.id,
            complete: t.cursor == t.count && t.pending.is_none(),
            exact_source: source.samples.len as u64 == t.count,
        })
    }
    pub(crate) fn clear_tail_displays(&mut self) {
        self.invalidate_live_frames(None);
        self.tails = [None; 2];
        self.preparations
            .retain(|t| !matches!(t.proof, SourceProof::DisplayTail { .. }));
        self.pages
            .retain(|p| !matches!(p.proof, SourceProof::DisplayTail { .. }));
    }
    pub(crate) fn clear_stroke_tail_displays(&mut self, stroke: u64) {
        self.invalidate_live_frames(Some(stroke));
        let ids = self
            .tails
            .map(|t| t.filter(|t| t.stroke == stroke).map(|t| t.id));
        for id in ids.into_iter().flatten() {
            self.remove_tail_display(id);
        }
    }
    pub fn release_tail_display(&mut self, owner: u64, session: u64, id: u64) -> Code {
        if let Err(c) = self.session(owner, session) {
            return c;
        }
        self.remove_tail_display(id);
        Code::Ok
    }
    fn remove_tail_display(&mut self, id: u64) {
        for slot in &mut self.tails {
            if slot.is_some_and(|t| t.id == id) {
                *slot = None;
            }
        }
        self.preparations.retain(
            |t| !matches!(t.proof, SourceProof::DisplayTail { id: parent, .. } if parent == id),
        );
        self.pages.retain(
            |p| !matches!(p.proof, SourceProof::DisplayTail { id: parent, .. } if parent == id),
        );
    }
}
