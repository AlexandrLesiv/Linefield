use crate::{Code, Engine, FrameAuthority, FrameReceipt, Phase};

#[derive(Clone, Copy, Default)]
pub struct FrameCapture {
    pub id: u64,
    pub source: u64,
    pub source_count: u64,
    pub ordinal: u64,
    pub cutoff_count: u64,
    pub cutoff_through: u64,
    pub mapping: u64,
}
impl Engine {
    pub fn capture_live_frame(
        &mut self,
        owner: u64,
        session: u64,
        mapping: u64,
        expected_source: u64,
    ) -> Result<FrameCapture, Code> {
        self.mapping(owner, session, mapping)?;
        let source = self
            .document
            .active
            .as_ref()
            .filter(|s| expected_source != 0 && s.id == expected_source)
            .ok_or(Code::StaleScene)?;
        let source_count = source.samples.len as u64;
        let f = self.capture_special_frame(mapping, FrameAuthority::LiveSource, expected_source)?;
        Ok(FrameCapture {
            id: f.id,
            source: expected_source,
            source_count,
            ordinal: f.ordinal as u64,
            mapping: f.mapping,
            ..FrameCapture::default()
        })
    }
    pub fn capture_display_frame(
        &mut self,
        owner: u64,
        session: u64,
        mapping: u64,
    ) -> Result<FrameCapture, Code> {
        self.mapping(owner, session, mapping)?;
        if self.document.gesture.is_some() && self.document.active.is_none() {
            return Err(Code::Active);
        }
        let f = self.capture_special_frame(mapping, FrameAuthority::DisplayOnly, 0)?;
        Ok(FrameCapture {
            id: f.id,
            cutoff_count: f.count as u64,
            cutoff_through: f.through,
            mapping: f.mapping,
            ..FrameCapture::default()
        })
    }
    pub fn capture_view_display_frame(
        &mut self,
        owner: u64,
        session: u64,
        mapping: u64,
        candidate: u64,
    ) -> Result<FrameCapture, Code> {
        let q = self.current_coverage(owner, session, mapping, 0, 0, candidate)?;
        if !q.view_gesture_active || q.active_source != 0 {
            return Err(Code::Active);
        }
        if !q.candidate_valid || !q.candidate_at_cutoff || !q.candidate_content_current {
            return Err(Code::StaleScene);
        }
        self.frame_transform(owner, session, mapping, candidate)?;
        let f = self.capture_special_frame(mapping, FrameAuthority::DisplayOnly, 0)?;
        Ok(FrameCapture {
            id: f.id,
            cutoff_count: f.count as u64,
            cutoff_through: f.through,
            mapping: f.mapping,
            ..FrameCapture::default()
        })
    }
    fn capture_special_frame(
        &mut self,
        mapping: u64,
        authority: FrameAuthority,
        source: u64,
    ) -> Result<FrameReceipt, Code> {
        let current = self
            .current
            .filter(|s| s.phase == Phase::Ready)
            .ok_or(Code::Unavailable)?;
        let metrics = current.metrics.ok_or(Code::Unavailable)?;
        let id = self.frame_counter.checked_add(1).ok_or(Code::Exhausted)?;
        let count = self.document.visible;
        let through = count
            .checked_sub(1)
            .and_then(|i| self.document.strokes.get(i))
            .map_or(0, |s| s.id);
        self.insert_frame(FrameReceipt {
            id,
            through,
            count,
            content: 0,
            mapping,
            authority,
            source,
            ordinal: count,
            view: self.document.view,
            metrics,
        })
    }
}
