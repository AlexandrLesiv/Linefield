use crate::{Code, Engine, FrameAuthority, FrameReceipt, Phase};

const _: () = assert!(size_of::<Option<FrameReceipt>>() <= 256);
const _: () = assert!(size_of::<Option<crate::tail_display::TailDisplay>>() <= 512);
const _: () = assert!(
    size_of::<[Option<FrameReceipt>; 8]>()
        + size_of::<[Option<crate::tail_display::TailDisplay>; 2]>()
        <= 3072
);

impl Engine {
    pub(crate) fn retained_frame(&self, id: u64) -> Option<FrameReceipt> {
        self.frames.iter().flatten().find(|f| f.id == id).copied()
    }
    pub(crate) fn insert_frame(&mut self, frame: FrameReceipt) -> Result<FrameReceipt, Code> {
        if self.receipt_count() >= 8 {
            return Err(Code::Capacity);
        }
        let slot = self
            .frames
            .iter_mut()
            .find(|f| f.is_none())
            .ok_or(Code::Capacity)?;
        *slot = Some(frame);
        self.frame_counter = frame.id;
        Ok(frame)
    }
    pub(crate) fn prefix_current(&self, frame: FrameReceipt) -> bool {
        frame.count <= self.document.visible
            && if frame.count == 0 {
                frame.through == 0
            } else {
                self.document
                    .strokes
                    .get(frame.count - 1)
                    .is_some_and(|s| s.id == frame.through)
            }
    }
    pub(crate) fn live_source_count(&self, frame: FrameReceipt) -> Option<(u64, bool)> {
        if let Some(s) = self
            .document
            .active
            .as_ref()
            .filter(|s| s.id == frame.source)
        {
            return Some((s.samples.len as u64, true));
        }
        self.document
            .strokes
            .get(frame.ordinal)
            .filter(|s| frame.ordinal < self.document.visible && s.id == frame.source)
            .map(|s| (s.samples.len as u64, false))
    }
    pub(crate) fn live_frame_receipt(
        &self,
        owner: u64,
        session: u64,
        id: u64,
        source: u64,
    ) -> Result<FrameReceipt, Code> {
        self.session(owner, session)?;
        let f = self.retained_frame(id).ok_or(Code::StaleScene)?;
        if f.authority != FrameAuthority::LiveSource || f.source != source {
            return Err(Code::Invalid);
        }
        let current = self.current.ok_or(Code::Unavailable)?;
        if current.phase != Phase::Ready {
            return Err(Code::Unavailable);
        }
        if current.metrics != Some(f.metrics) {
            return Err(Code::StaleMapping);
        }
        self.live_source_count(f).ok_or(Code::StaleScene)?;
        Ok(f)
    }
    pub(crate) fn invalidate_live_frames(&mut self, source: Option<u64>) {
        for slot in &mut self.frames {
            if slot.is_some_and(|f| {
                f.authority == FrameAuthority::LiveSource && source.is_none_or(|id| f.source == id)
            }) {
                *slot = None;
            }
        }
    }
}
