use crate::{Code, Engine, geometry_cursor::PageKey, numerics::Axis};
use linefield_editor_geometry::{Bounds, Point};
#[derive(Clone, Copy)]
pub(crate) struct Ticket {
    pub token: u64,
    pub key: PageKey,
    pub anchor: [Axis; 2],
    pub clip: Option<Bounds>,
    pub ordinal: u64,
    pub complete: bool,
    pub hull: Bounds,
    pub proof: crate::source_proof::SourceProof,
}
pub struct PreparationInput {
    pub token: u64,
    pub points: Vec<Point>,
    pub first: usize,
    pub end: usize,
    pub detail: f64,
    pub clip: Option<Bounds>,
    pub through: u64,
}
impl Engine {
    #[expect(
        clippy::too_many_arguments,
        reason = "MIG-C1 named typed preparation query"
    )]
    pub(crate) fn preparation_at(
        &mut self,
        owner: u64,
        session: u64,
        scene: u64,
        stroke: u64,
        chunk: u64,
        revision: u64,
        detail: f64,
        v: crate::numerics::Viewport,
        m: crate::Metrics,
    ) -> Result<PreparationInput, Code> {
        self.stroke_info(owner, session, scene, stroke)?;
        if !detail.is_finite() || !(0.01..=128.0).contains(&detail) || detail < v.zoom * m.backing {
            return Err(Code::Invalid);
        }
        let source = self.document.stroke(stroke).ok_or(Code::StaleScene)?;
        let start = usize::try_from(chunk)
            .ok()
            .and_then(|v| v.checked_mul(128))
            .ok_or(Code::Invalid)?;
        if start >= source.samples.len
            || source.samples.len.min(start.saturating_add(129)) as u64 != revision
        {
            return Err(Code::StaleScene);
        }
        let end = (start + 128).min(source.samples.len);
        self.prepare_range(
            stroke,
            chunk,
            revision,
            detail,
            v,
            m,
            start,
            end,
            crate::source_proof::SourceProof::Chunk,
        )
    }
}
