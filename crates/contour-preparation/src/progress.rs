use crate::{
    Preparation, Status,
    proof::{Decision, Proof},
};
impl Preparation {
    pub fn step(&mut self) -> Status {
        if self.releasing {
            return self.release();
        }
        if self.disabled {
            return Status::OriginalRequired;
        }
        if self.proof.is_none() {
            let Some(contour) = self.incoming.get(self.incoming_index).copied() else {
                return self.status();
            };
            self.proof = Some(Proof::new(contour));
        }
        let Some(decision) = self.decision.take() else {
            let Some(proof) = self.proof.as_mut() else {
                return Status::Invalid;
            };
            let before = proof.predicates;
            let result = proof.step(&self.index);
            self.counters.predicates = self
                .counters
                .predicates
                .saturating_add(u64::from(proof.predicates - before));
            match result {
                Decision::Pending => {}
                Decision::Original => {
                    self.disabled = true;
                    self.output.clear();
                    self.proof = None;
                    return Status::OriginalRequired;
                }
                terminal => self.decision = Some(terminal),
            }
            return Status::Pending;
        };
        let Some(proof) = self.proof.take() else {
            return Status::Invalid;
        };
        self.counters.original = self.counters.original.saturating_add(1);
        self.counters.visits = self.counters.visits.saturating_add(proof.visits as u64);
        self.counters.comparisons = self
            .counters
            .comparisons
            .saturating_add(proof.comparisons as u64);
        if matches!(decision, Decision::Keep) {
            self.output.push(proof.contour);
            self.output_cursor += proof.contour.verbs();
            self.index.insert(proof.contour);
            self.counters.retained = self.counters.retained.saturating_add(1);
            if proof.predicates == 256 {
                self.counters.budget_keeps = self.counters.budget_keeps.saturating_add(1);
            }
        } else if proof.duplicate {
            self.counters.duplicates = self.counters.duplicates.saturating_add(1);
        } else {
            self.counters.covered = self.counters.covered.saturating_add(1);
        }
        self.source_cursor += proof.contour.verbs();
        self.incoming_index += 1;
        self.status()
    }
}
