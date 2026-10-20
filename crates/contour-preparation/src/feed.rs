use crate::{Preparation, Status, page::parse};
pub struct Feed<'a> {
    pub capture: u64,
    pub start: u64,
    pub end: u64,
    pub final_prefix: bool,
    pub verbs: &'a [u8],
    pub points: &'a [f32],
    pub weights: &'a [f32],
}
impl Preparation {
    pub fn feed(&mut self, input: Feed<'_>) -> Status {
        let Feed {
            capture,
            start,
            end,
            final_prefix,
            verbs,
            points,
            weights,
        } = input;
        if self.releasing || capture != self.identity.capture {
            return Status::Stale;
        }
        if self.disabled {
            return Status::OriginalRequired;
        }
        if self.incoming_index != self.incoming.len()
            || self.proof.is_some()
            || !self.output.is_empty()
            || start != self.source_cursor
            || end > self.identity.verbs
            || start.checked_add(verbs.len() as u64) != Some(end)
            || final_prefix != (end == self.identity.verbs)
        {
            return Status::Invalid;
        }
        match parse(verbs, points, weights) {
            Ok(contours) => {
                self.incoming = contours;
                self.incoming_index = 0;
                Status::Accepted
            }
            Err(status) => status,
        }
    }
}
