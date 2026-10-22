use crate::{Code, Engine, Placement, source_proof::SourceProof};
impl Engine {
    pub fn tail_display_placement(
        &self,
        owner: u64,
        session: u64,
        mapping: u64,
        id: u64,
        page: u64,
    ) -> Result<Placement, Code> {
        self.mapping(owner, session, mapping)?;
        let t = self.tail_display(owner, session, id)?;
        let descriptor = self
            .pages
            .iter()
            .find(|p| p.id == page)
            .ok_or(Code::StaleScene)?;
        if descriptor.key.stroke != t.stroke
            || !matches!(descriptor.proof, SourceProof::DisplayTail { id: parent, count } if parent == id && count == t.count)
        {
            return Err(Code::StaleScene);
        }
        self.project_descriptor(descriptor, t.anchor.view, t.anchor.metrics, t.style.width)
    }
    pub fn tail_display_transform(
        &self,
        owner: u64,
        session: u64,
        mapping: u64,
        id: u64,
    ) -> Result<Placement, Code> {
        self.mapping(owner, session, mapping)?;
        let t = self.tail_display(owner, session, id)?;
        self.display_transform(t.anchor.view, t.anchor.metrics)
    }
}
