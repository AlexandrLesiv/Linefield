//! Disposable projected-contour preparation; deliberately has no editor dependency.
#![forbid(unsafe_code)]
mod contour;
mod feed;
mod identity;
mod index;
mod integer;
mod page;
mod point;
mod progress;
mod proof;
use contour::Contour;
pub use feed::Feed;
pub use identity::Identity;
use index::Index;
pub use page::Page;
use proof::Proof;
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Status {
    Accepted,
    Pending,
    Complete,
    OriginalRequired,
    Released,
    Stale,
    Invalid,
    Capacity,
    Exhausted,
}
impl Status {
    pub fn label(self) -> &'static str {
        match self {
            Self::Accepted => "accepted",
            Self::Pending => "pending",
            Self::Complete => "complete",
            Self::OriginalRequired => "original-required",
            Self::Released => "released",
            Self::Stale => "stale",
            Self::Invalid => "invalid",
            Self::Capacity => "capacity",
            Self::Exhausted => "exhausted",
        }
    }
}
#[derive(Clone, Copy, Default)]
pub struct Counters {
    pub original: u64,
    pub retained: u64,
    pub duplicates: u64,
    pub covered: u64,
    pub predicates: u64,
    pub visits: u64,
    pub comparisons: u64,
    pub budget_keeps: u64,
}
pub struct Preparation {
    identity: Identity,
    index: Index,
    incoming: Vec<Contour>,
    incoming_index: usize,
    output: Vec<Contour>,
    proof: Option<Proof>,
    decision: Option<proof::Decision>,
    source_cursor: u64,
    output_cursor: u64,
    drained_cursor: u64,
    generation: u64,
    disabled: bool,
    releasing: bool,
    counters: Counters,
}
impl Preparation {
    pub fn create(identity: Identity) -> Result<Self, Status> {
        identity.validate()?;
        let mut output = Vec::new();
        output.try_reserve_exact(32).map_err(|_| Status::Capacity)?;
        Ok(Self {
            identity,
            index: Index::default(),
            incoming: Vec::new(),
            incoming_index: 0,
            output,
            proof: None,
            decision: None,
            source_cursor: 0,
            output_cursor: 0,
            drained_cursor: 0,
            generation: 1,
            disabled: false,
            releasing: false,
            counters: Counters::default(),
        })
    }
    pub fn identity(&self) -> Identity {
        self.identity
    }
    pub fn source_cursor(&self) -> u64 {
        self.source_cursor
    }
    pub fn output_cursor(&self) -> u64 {
        self.output_cursor
    }
    pub fn generation(&self) -> u64 {
        self.generation
    }
    pub fn counters(&self) -> Counters {
        self.counters
    }
    pub fn bytes(&self) -> usize {
        self.index.bytes()
    }
    pub fn required_bytes(&self) -> usize {
        size_of::<Self>() - size_of::<Index>()
            + (self.incoming.capacity() + self.output.capacity()) * size_of::<Contour>()
    }
    pub fn status(&self) -> Status {
        if self.releasing {
            Status::Pending
        } else if self.disabled {
            Status::OriginalRequired
        } else if self.source_cursor == self.identity.verbs {
            Status::Complete
        } else {
            Status::Pending
        }
    }
    pub fn begin_next(&mut self, next: Identity) -> Status {
        if self.releasing {
            return Status::Stale;
        }
        if self.disabled {
            return Status::OriginalRequired;
        }
        if self.status() != Status::Complete || !self.output.is_empty() {
            return Status::Invalid;
        }
        if next.validate().is_err() || !self.identity.extends(next) {
            return Status::Stale;
        }
        let Some(generation) = self.generation.checked_add(1) else {
            return Status::Exhausted;
        };
        self.identity = next;
        self.generation = generation;
        Status::Accepted
    }
    pub fn drain(&mut self, cursor: u64) -> Result<Page, Status> {
        if self.releasing || self.disabled {
            return Err(Status::Stale);
        }
        if cursor != self.drained_cursor {
            return Err(Status::Invalid);
        }
        let page = Page::from_contours(&self.output)?;
        self.output.clear();
        self.drained_cursor = self.output_cursor;
        Ok(page)
    }
    pub fn release(&mut self) -> Status {
        self.releasing = true;
        self.incoming.clear();
        self.output.clear();
        self.proof = None;
        self.decision = None;
        if self.index.release_step() {
            Status::Released
        } else {
            Status::Pending
        }
    }
}
