use crate::document::Document;

#[derive(Clone, Copy, Default, PartialEq, Eq)]
pub(crate) struct Key(pub [u64; 4]);
#[derive(Clone, Copy)]
pub(crate) struct Range {
    pub source: usize,
    pub start: usize,
    pub end: usize,
}
impl Range {
    pub fn prefix(start: usize, end: usize) -> Self {
        Self {
            source: usize::MAX,
            start,
            end,
        }
    }
    pub fn key(self, document: &Document) -> Key {
        if self.source == usize::MAX {
            Key([
                0,
                document.strokes[self.start].id,
                document.strokes[self.end - 1].id,
                (self.end - self.start) as u64,
            ])
        } else {
            let source = &document.strokes[self.source];
            Key([
                source.id,
                self.start as u64,
                self.end as u64,
                source.samples.len as u64,
            ])
        }
    }
    pub fn children(self, document: &Document) -> Option<(Self, Option<Self>)> {
        if self.end - self.start > 1 {
            let mid = self.start + (self.end - self.start) / 2;
            return Some((Self { end: mid, ..self }, Some(Self { start: mid, ..self })));
        }
        if self.source != usize::MAX {
            return None;
        }
        let count = document.strokes[self.start].samples.len;
        Some((
            Self {
                source: self.start,
                start: 0,
                end: count.div_ceil(128),
            },
            None,
        ))
    }
}
