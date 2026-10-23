use crate::{
    Code, FrameReceipt,
    visibility_cache::{Cache, Pin},
    visibility_range::Range,
};

pub(crate) struct Step {
    pub range: Range,
    pub phase: u8,
    pub pin: Option<Pin>,
}
pub(crate) struct Cursor {
    pub id: u64,
    pub frame: u64,
    pub predecessor: u64,
    pub captured: FrameReceipt,
    pub stack: Vec<Step>,
}
impl Cursor {
    pub fn new(id: u64, frame: FrameReceipt, predecessor: u64, start: usize) -> Result<Self, Code> {
        let mut stack = Vec::new();
        stack.try_reserve_exact(128).map_err(|_| Code::Capacity)?;
        if stack.capacity() * size_of::<Step>() + size_of::<Self>() > 8192 {
            return Err(Code::Capacity);
        }
        if start < frame.count {
            stack.push(Step {
                range: Range::prefix(start, frame.count),
                phase: 0,
                pin: None,
            });
        }
        Ok(Self {
            id,
            frame: frame.id,
            predecessor,
            captured: frame,
            stack,
        })
    }
    pub fn release(self, cache: &mut Cache) {
        for step in self.stack {
            if let Some(pin) = step.pin {
                cache.unpin(pin);
            }
        }
    }
    pub fn bytes(&self) -> usize {
        self.stack.capacity() * size_of::<Step>()
    }
}
#[derive(Default)]
pub struct VisibilityPage {
    pub strokes: Vec<u64>,
    pub chunks: Vec<u64>,
    pub revisions: Vec<u64>,
    pub next: u64,
    pub done: bool,
    pub visited: usize,
    pub hulls: usize,
    pub index_bytes: usize,
    pub cursor_bytes: usize,
    pub reply_bytes: usize,
}
impl VisibilityPage {
    pub(crate) fn reserve() -> Result<Self, Code> {
        let mut page = Self::default();
        page.strokes
            .try_reserve_exact(128)
            .map_err(|_| Code::Capacity)?;
        page.chunks
            .try_reserve_exact(128)
            .map_err(|_| Code::Capacity)?;
        page.revisions
            .try_reserve_exact(128)
            .map_err(|_| Code::Capacity)?;
        Ok(page)
    }
    pub fn bytes(&self) -> usize {
        (self.strokes.capacity() + self.chunks.capacity() + self.revisions.capacity())
            * size_of::<u64>()
    }
}
