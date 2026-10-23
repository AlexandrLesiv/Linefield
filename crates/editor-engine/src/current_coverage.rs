use crate::{Code, Engine, FrameAuthority, FrameReceipt, Phase};

#[derive(Clone, Copy, Default)]
pub enum LiveState {
    #[default]
    None,
    Active,
    Ended,
    Obsolete,
    Included,
}
impl LiveState {
    pub fn label(self) -> &'static str {
        match self {
            Self::None => "none",
            Self::Active => "active",
            Self::Ended => "ended",
            Self::Obsolete => "obsolete",
            Self::Included => "included",
        }
    }
}
#[derive(Clone, Copy, Default)]
pub struct CurrentCoverage {
    pub completed_count: u64,
    pub completed_through: u64,
    pub completed_content: u64,
    pub active_source: u64,
    pub active_count: u64,
    pub view_gesture_active: bool,
    pub can_fold: bool,
    pub live_state: LiveState,
    pub live_source: u64,
    pub live_count: u64,
    pub installed_valid: bool,
    pub candidate_valid: bool,
    pub candidate_count: u64,
    pub candidate_through: u64,
    pub next_source: u64,
    pub next_count: u64,
    pub candidate_at_cutoff: bool,
    pub candidate_content_current: bool,
    pub candidate_view_current: bool,
    pub candidate_mapping_current: bool,
    pub candidate_recapture_safe: bool,
    pub candidate_exact_view: bool,
    pub candidate_includes_live: bool,
}
impl Engine {
    pub fn current_coverage(
        &self,
        owner: u64,
        session: u64,
        mapping: u64,
        live: u64,
        installed: u64,
        candidate: u64,
    ) -> Result<CurrentCoverage, Code> {
        self.mapping(owner, session, mapping)?;
        let live_requested = live != 0;
        let state = self.current.ok_or(Code::Unavailable)?;
        let installed = self.optional_prefix(installed)?;
        let candidate = self.optional_prefix(candidate)?;
        let live = if live == 0 {
            None
        } else {
            match self.retained_frame(live) {
                Some(f) if f.authority != FrameAuthority::LiveSource => return Err(Code::Invalid),
                value => value,
            }
        };
        let mut q = CurrentCoverage {
            completed_count: self.document.visible as u64,
            completed_through: self
                .document
                .visible
                .checked_sub(1)
                .and_then(|i| self.document.strokes.get(i))
                .map_or(0, |s| s.id),
            completed_content: self.content_counter,
            active_source: self.document.active.as_ref().map_or(0, |s| s.id),
            active_count: self
                .document
                .active
                .as_ref()
                .map_or(0, |s| s.samples.len as u64),
            view_gesture_active: self.document.gesture.is_some() && self.document.active.is_none(),
            installed_valid: installed.is_some_and(|f| self.prefix_current(f)),
            live_state: if live_requested {
                LiveState::Obsolete
            } else {
                LiveState::None
            },
            ..CurrentCoverage::default()
        };
        q.can_fold =
            state.phase == Phase::Ready && state.metrics.is_some() && !q.view_gesture_active;
        if let Some(f) = candidate {
            q.candidate_count = f.count as u64;
            q.candidate_through = f.through;
            q.candidate_valid = self.prefix_current(f);
            q.candidate_at_cutoff = q.candidate_valid && f.count == self.document.visible;
            q.candidate_content_current = f.content == self.content_counter;
            q.candidate_view_current =
                f.view == self.document.view && state.metrics == Some(f.metrics);
            q.candidate_mapping_current = f.mapping == mapping;
            let current_view =
                state.phase == Phase::Ready && q.candidate_at_cutoff && q.candidate_view_current;
            q.candidate_recapture_safe = current_view && f.raster == self.raster.capture;
            q.candidate_exact_view =
                current_view && q.candidate_content_current && q.candidate_mapping_current;
            if q.candidate_valid && f.count < self.document.visible {
                let next = &self.document.strokes[f.count];
                q.next_source = next.id;
                q.next_count = next.samples.len as u64;
            }
        }
        self.classify_live(&mut q, live, installed, candidate);
        Ok(q)
    }
    fn optional_prefix(&self, id: u64) -> Result<Option<FrameReceipt>, Code> {
        if id == 0 {
            return Ok(None);
        }
        let f = self.retained_frame(id).ok_or(Code::StaleScene)?;
        if f.authority != FrameAuthority::Prefix {
            return Err(Code::Invalid);
        }
        Ok(Some(f))
    }
    fn classify_live(
        &self,
        q: &mut CurrentCoverage,
        live: Option<FrameReceipt>,
        installed: Option<FrameReceipt>,
        candidate: Option<FrameReceipt>,
    ) {
        let Some(f) = live else {
            return;
        };
        q.live_source = f.source;
        q.live_state = LiveState::Obsolete;
        if self
            .current
            .is_none_or(|s| s.phase != Phase::Ready || s.metrics != Some(f.metrics))
        {
            return;
        }
        let Some((count, active)) = self.live_source_count(f) else {
            return;
        };
        q.live_count = count;
        if active {
            q.live_state = LiveState::Active;
            return;
        }
        q.live_state = if q.installed_valid && installed.is_some_and(|i| f.ordinal < i.count) {
            LiveState::Included
        } else {
            LiveState::Ended
        };
        q.candidate_includes_live =
            q.candidate_valid && candidate.is_some_and(|c| f.ordinal < c.count);
    }
}
