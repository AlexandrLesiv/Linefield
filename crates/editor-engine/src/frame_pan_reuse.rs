use crate::{Code, Engine};
#[derive(Clone, Copy, Default)]
pub enum PanReuseMiss {
    #[default]
    None,
    Fractional,
    Basis,
    Range,
    Uncertified,
    SourceRelation,
    Unavailable,
}
impl PanReuseMiss {
    pub fn label(self) -> &'static str {
        match self {
            Self::None => "none",
            Self::Fractional => "fractional",
            Self::Basis => "basis",
            Self::Range => "range",
            Self::Uncertified => "uncertified",
            Self::SourceRelation => "source-relation",
            Self::Unavailable => "unavailable",
        }
    }
}
#[derive(Clone, Copy, Default)]
pub struct FramePanReuse {
    pub reusable: bool,
    pub miss: PanReuseMiss,
    pub source_count: u64,
    pub source_through: u64,
    pub target_count: u64,
    pub target_through: u64,
    pub epoch: u64,
    pub shift: [i32; 2],
}
impl Engine {
    pub fn frame_pan_reuse(
        &self,
        owner: u64,
        session: u64,
        mapping: u64,
        source: u64,
        target: u64,
    ) -> Result<FramePanReuse, Code> {
        self.mapping(owner, session, mapping)?;
        let source = self.frame_receipt(owner, session, source)?;
        let target = self.frame_receipt(owner, session, target)?;
        if target.mapping != mapping
            || self.current.and_then(|v| v.metrics) != Some(target.metrics)
            || target.view != self.document.view
        {
            return Err(Code::StaleMapping);
        }
        let mut result = FramePanReuse {
            source_count: source.count as u64,
            source_through: source.through,
            target_count: target.count as u64,
            target_through: target.through,
            ..Default::default()
        };
        result.miss = if source.count != target.count || source.through != target.through {
            PanReuseMiss::SourceRelation
        } else if source.metrics != target.metrics || source.raster.anchor != target.raster.anchor {
            PanReuseMiss::Basis
        } else if !source.raster.anchored() || !target.raster.anchored() {
            PanReuseMiss::Uncertified
        } else if source.raster.epoch != target.raster.epoch {
            PanReuseMiss::Unavailable
        } else {
            let shifts =
                [0, 1].map(|i| target.raster.offset[i].checked_sub(source.raster.offset[i]));
            if let [Some(x), Some(y)] = shifts {
                result.reusable = true;
                result.epoch = target.raster.epoch;
                result.shift = [x, y];
                PanReuseMiss::None
            } else {
                PanReuseMiss::Range
            }
        };
        Ok(result)
    }
}
