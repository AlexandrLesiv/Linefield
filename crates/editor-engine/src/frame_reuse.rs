use crate::{Code, Engine, Phase};

#[derive(Clone, Copy, Default)]
pub enum FrameReuseMiss {
    #[default]
    None,
    View,
    SamePrefix,
    SuccessorCount,
}
impl FrameReuseMiss {
    pub fn label(self) -> &'static str {
        match self {
            Self::None => "none",
            Self::View => "view",
            Self::SamePrefix => "same-prefix",
            Self::SuccessorCount => "successor-count",
        }
    }
}
#[derive(Clone, Copy, Default)]
pub struct FrameReuse {
    pub reusable: bool,
    pub miss: FrameReuseMiss,
    pub source_count: u64,
    pub source_through: u64,
    pub target_count: u64,
    pub target_through: u64,
}
impl Engine {
    pub fn frame_reuse(
        &self,
        owner: u64,
        session: u64,
        mapping: u64,
        source: u64,
        target: u64,
    ) -> Result<FrameReuse, Code> {
        self.mapping(owner, session, mapping)?;
        let current = self
            .current
            .filter(|s| s.phase == Phase::Ready)
            .ok_or(Code::Unavailable)?;
        let metrics = current.metrics.ok_or(Code::Unavailable)?;
        let source = self.frame_receipt(owner, session, source)?;
        let target = self.frame_receipt(owner, session, target)?;
        if target.mapping != mapping
            || target.metrics != metrics
            || target.view != self.document.view
        {
            return Err(Code::StaleMapping);
        }
        let mut result = FrameReuse {
            source_count: source.count as u64,
            source_through: source.through,
            target_count: target.count as u64,
            target_through: target.through,
            ..Default::default()
        };
        result.miss = if source.view != target.view || source.metrics != target.metrics {
            FrameReuseMiss::View
        } else if source.count == target.count {
            FrameReuseMiss::SamePrefix
        } else if source.count.checked_add(1) != Some(target.count) {
            FrameReuseMiss::SuccessorCount
        } else {
            if self
                .document
                .strokes
                .get(source.count)
                .is_none_or(|s| s.id != target.through)
            {
                return Err(Code::StaleScene);
            }
            result.reusable = true;
            FrameReuseMiss::None
        };
        Ok(result)
    }
}
