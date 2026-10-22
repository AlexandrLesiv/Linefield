use crate::geometry_cursor::PageKey;
#[derive(Clone, Copy, Debug, Default)]
pub(crate) enum SourceProof {
    #[default]
    Chunk,
    Prefix(u64),
    Exact(u64),
    DisplayTail {
        id: u64,
        count: u64,
    },
}
impl SourceProof {
    pub fn current(self, len: u64, key: PageKey) -> bool {
        match self {
            Self::Chunk => {
                len.min(key.chunk.saturating_mul(128).saturating_add(129)) == key.revision
            }
            Self::Prefix(required) => len >= required,
            Self::Exact(required) => len == required,
            Self::DisplayTail { .. } => false,
        }
    }
}
