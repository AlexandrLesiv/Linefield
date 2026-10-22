use crate::{Code, Engine, PreparationInput, source_proof::SourceProof};
impl Engine {
    pub fn tail_display_preparation(
        &mut self,
        owner: u64,
        session: u64,
        mapping: u64,
        id: u64,
    ) -> Result<PreparationInput, Code> {
        self.mapping(owner, session, mapping)?;
        let t = self.tail_display(owner, session, id)?;
        if t.pending.is_some() {
            return Err(Code::Sequence);
        }
        let end = t.cursor.saturating_add(128).min(t.count);
        let input = if t.cursor == t.count {
            PreparationInput {
                token: 0,
                points: Vec::new(),
                first: 0,
                end: 0,
                detail: t.detail,
                clip: None,
                through: end,
            }
        } else {
            self.prepare_range(
                t.stroke,
                t.cursor,
                t.count,
                t.detail,
                t.anchor.view,
                t.anchor.metrics,
                t.cursor as usize,
                end as usize,
                SourceProof::DisplayTail { id, count: t.count },
            )?
        };
        let tail = self
            .tails
            .iter_mut()
            .flatten()
            .find(|v| v.id == id)
            .ok_or(Code::StaleScene)?;
        if input.token == 0 {
            tail.cursor = end;
        } else {
            tail.pending = Some((input.token, end));
        }
        Ok(input)
    }
    pub(crate) fn tail_ticket(
        &self,
        owner: u64,
        session: u64,
        id: u64,
        token: u64,
    ) -> Result<(), Code> {
        let t = self.tail_display(owner, session, id)?;
        if t.pending.is_none_or(|p| p.0 != token) {
            return Err(Code::Sequence);
        }
        let ticket = self
            .preparations
            .iter()
            .find(|p| p.token == token)
            .ok_or(Code::StaleScene)?;
        if !matches!(ticket.proof, SourceProof::DisplayTail { id: parent, count } if parent == id && count == t.count)
        {
            return Err(Code::StaleScene);
        }
        Ok(())
    }
    #[expect(
        clippy::too_many_arguments,
        reason = "named checked display-only adoption"
    )]
    pub fn adopt_tail_display(
        &mut self,
        owner: u64,
        session: u64,
        id: u64,
        token: u64,
        ordinal: u64,
        data: &[f32],
        origin: [f64; 2],
    ) -> Result<u64, Code> {
        self.tail_ticket(owner, session, id, token)?;
        self.adopt_preparation_data(token, ordinal, data, origin)
    }
    pub fn complete_tail_display_preparation(
        &mut self,
        owner: u64,
        session: u64,
        id: u64,
        token: u64,
        ordinal: u64,
    ) -> Code {
        if let Err(c) = self.tail_ticket(owner, session, id, token) {
            return c;
        }
        let Some(ticket) = self.preparations.iter_mut().find(|p| p.token == token) else {
            return Code::StaleScene;
        };
        if ticket.complete || ticket.ordinal != ordinal {
            return Code::Sequence;
        }
        ticket.complete = true;
        let Some(t) = self.tails.iter_mut().flatten().find(|t| t.id == id) else {
            return Code::StaleScene;
        };
        let Some((_, end)) = t.pending.take() else {
            return Code::Sequence;
        };
        t.cursor = end;
        Code::Ok
    }
}
