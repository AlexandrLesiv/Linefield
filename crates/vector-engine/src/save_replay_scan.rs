//! Bounded metadata scan. The first pass discovers sources; the second applies records.
use super::{save_decode::Read, save_replay_model::Model};
#[derive(Default)]
pub(super) struct Scan {
    bytes: Vec<u8>,
    header: bool,
    descriptors: usize,
    operations: usize,
    body: usize,
    index: usize,
    pub sources: Vec<(usize, usize)>,
    pub done: bool,
    samples: usize,
    checkpoint: bool,
}
impl Scan {
    pub fn append(
        &mut self,
        bytes: &[u8],
        base: u64,
        result: u64,
        streams: usize,
        apply: bool,
        model: &mut Model,
    ) -> Option<()> {
        self.bytes.try_reserve(bytes.len()).ok()?;
        self.bytes.extend_from_slice(bytes);
        let mut at = 0;
        loop {
            let available = &self.bytes[at..];
            if !self.header {
                if available.len() < 32 {
                    break;
                }
                let mut r = Read {
                    bytes: available,
                    at: 0,
                };
                let magic = r.take(4)?;
                self.checkpoint = magic == b"LFC4";
                if (magic != b"LFD3" && !self.checkpoint)
                    || r.word()? != 1
                    || r.wide()? != base
                    || r.wide()? != result
                {
                    return None;
                }
                self.operations = r.word()?;
                self.descriptors = r.word()?;
                if self.operations == 0
                    || self.operations > if self.checkpoint { 110_000 } else { 100_000 }
                    || self.descriptors + 1 != streams
                    || (!self.checkpoint && base.checked_add(self.operations as u64)? != result)
                    || (self.checkpoint && base != 0)
                {
                    return None;
                }
                self.header = true;
                at += 32;
            } else if self.descriptors > 0 {
                if available.len() < 8 {
                    break;
                }
                let mut r = Read {
                    bytes: available,
                    at: 0,
                };
                let id = r.word()?;
                let count = r.word()?;
                if id >= 100_000 || count == 0 || count > u32::MAX as usize / 40 {
                    return None;
                }
                self.samples = self.samples.checked_add(count)?;
                if !apply
                    && ((!self.checkpoint && id < model.high)
                        || model.sources.contains_key(&id)
                        || model
                            .samples
                            .checked_add(self.samples)?
                            .checked_mul(40)
                            .is_none())
                {
                    return None;
                }
                if !apply && !model.reserve_source(id) {
                    return None;
                }
                self.sources.try_reserve(1).ok()?;
                self.sources.push((id, count));
                self.descriptors -= 1;
                at += 8;
            } else if self.body > 0 {
                if !apply {
                    let n = self.body.min(available.len());
                    self.body -= n;
                    at += n;
                    if n == 0 {
                        break;
                    }
                } else {
                    let Some(size) = record_size(available)? else {
                        break;
                    };
                    if size > self.body {
                        return None;
                    }
                    if available[0] == 6 && !self.checkpoint {
                        return None;
                    }
                    let mut r = Read {
                        bytes: &available[..size],
                        at: 0,
                    };
                    model.record(&mut r)?;
                    if r.at != size {
                        return None;
                    }
                    self.body -= size;
                    at += size;
                }
            } else if self.index < self.operations {
                if available.len() < 12 {
                    break;
                }
                let mut r = Read {
                    bytes: available,
                    at: 0,
                };
                if r.wide()?
                    != if self.checkpoint {
                        result
                    } else {
                        base.checked_add(self.index as u64 + 1)?
                    }
                {
                    return None;
                }
                self.body = r.word()?;
                self.index += 1;
                at += 12;
            } else {
                self.done = true;
                if !available.is_empty() {
                    return None;
                }
                break;
            }
        }
        self.bytes.drain(..at);
        // Largest valid record is the bounded layer-order vector.
        if self.bytes.len() > 16389 {
            return None;
        }
        Some(())
    }
}
fn record_size(bytes: &[u8]) -> Option<Option<usize>> {
    let Some(tag) = bytes.first() else {
        return Some(None);
    };
    let size = match tag {
        1 => 121,
        2 => 5,
        6 => 5,
        3 => {
            if bytes.len() < 21 {
                return Some(None);
            }
            let n = u32::from_le_bytes(bytes[17..21].try_into().ok()?) as usize;
            if n > 512 {
                return None;
            }
            21 + n
        }
        4 => {
            if bytes.len() < 5 {
                return Some(None);
            }
            let n = u32::from_le_bytes(bytes[1..5].try_into().ok()?) as usize;
            if n == 0 || n > 4096 {
                return None;
            }
            5 + n * 4
        }
        5 => 9,
        _ => return None,
    };
    Some((bytes.len() >= size).then_some(size))
}
