use crate::Status;
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Identity {
    pub worker_epoch: u64,
    pub owner: u64,
    pub session: u64,
    pub stroke: u64,
    pub capture: u64,
    pub projection_kind: u8,
    pub projection: u64,
    pub samples: u64,
    pub verbs: u64,
}
impl Identity {
    pub(crate) fn validate(self) -> Result<(), Status> {
        if [
            self.worker_epoch,
            self.owner,
            self.session,
            self.stroke,
            self.capture,
            self.projection,
            self.samples,
        ]
        .contains(&0)
            || self.projection_kind > 1
            || self.samples.checked_mul(6).is_none_or(|n| self.verbs < n)
            || self.samples.checked_mul(11).is_none_or(|n| self.verbs > n)
        {
            Err(Status::Invalid)
        } else {
            Ok(())
        }
    }
    pub(crate) fn extends(self, next: Self) -> bool {
        self.worker_epoch == next.worker_epoch
            && self.owner == next.owner
            && self.session == next.session
            && self.stroke == next.stroke
            && self.projection_kind == next.projection_kind
            && self.projection == next.projection
            && next.samples >= self.samples
            && next.verbs >= self.verbs
            && ((next.samples == self.samples) == (next.verbs == self.verbs))
    }
}
