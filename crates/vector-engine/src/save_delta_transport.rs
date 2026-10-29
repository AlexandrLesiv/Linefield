use super::{
    save_delta::{Batch, Journal, JOURNAL},
    save_delta_wire as wire,
};
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn delta_revision() -> u64 {
    JOURNAL.with(|j| j.borrow().revision)
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn delta_durable() -> u64 {
    JOURNAL.with(|j| j.borrow().durable)
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn delta_status() -> u32 {
    JOURNAL.with(|j| j.borrow().overflow as u32)
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn delta_prepare() -> u32 {
    #[cfg(feature = "save-idle")]
    if super::save_idle::owned() {
        return 0;
    }
    JOURNAL.with(|j| {
        let mut j = j.borrow_mut();
        if j.overflow || j.batch.is_some() || j.operations == 0 {
            return 0;
        }
        let Some(token) = j.generation.checked_add(1) else {
            j.overflow = true;
            return 0;
        };
        let count: usize = j.sources.values().map(|p| p.len()).sum();
        if count > 1_000_000 {
            j.overflow = true;
            return 0;
        }
        let mut bytes = b"LFD3".to_vec();
        wire::word(&mut bytes, 1);
        wire::wide(&mut bytes, j.durable);
        wire::wide(&mut bytes, j.revision);
        wire::word(&mut bytes, j.operations);
        wire::word(&mut bytes, j.sources.len());
        for (id, p) in &j.sources {
            wire::word(&mut bytes, *id);
            wire::word(&mut bytes, p.len());
        }
        bytes.append(&mut j.pending);
        j.batch = Some(Batch {
            token,
            base: j.durable,
            result: j.revision,
            bytes,
            sources: std::mem::take(&mut j.sources).into_iter().collect(),
        });
        j.operations = 0;
        j.records = 0;
        j.generation = token;
        token
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn delta_base(token: u32) -> u64 {
    JOURNAL.with(|j| {
        j.borrow()
            .batch
            .as_ref()
            .filter(|b| b.token == token)
            .map_or(u64::MAX, |b| b.base)
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn delta_target(token: u32) -> u64 {
    JOURNAL.with(|j| {
        j.borrow()
            .batch
            .as_ref()
            .filter(|b| b.token == token)
            .map_or(u64::MAX, |b| b.result)
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn delta_stream_count(token: u32) -> usize {
    JOURNAL.with(|j| {
        j.borrow()
            .batch
            .as_ref()
            .filter(|b| b.token == token)
            .map_or(0, |b| b.sources.len() + 1)
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn delta_chunk(token: u32, stream: usize, chunk: usize) -> usize {
    JOURNAL.with(|j| {
        let mut j = j.borrow_mut();
        let Journal { batch, output, .. } = &mut *j;
        output.clear();
        let Some(b) = batch.as_ref().filter(|b| b.token == token) else {
            return usize::MAX;
        };
        if stream == 0 {
            let Some(start) = chunk.checked_mul(65520).filter(|s| *s <= b.bytes.len()) else {
                return usize::MAX;
            };
            output.extend_from_slice(&b.bytes[start..(start + 65520).min(b.bytes.len())]);
        } else {
            let Some((_, p)) = b.sources.get(stream - 1) else {
                return usize::MAX;
            };
            if wire::samples(p, chunk, output).is_none() {
                return usize::MAX;
            }
        }
        output.len()
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn delta_chunk_ptr() -> *const u8 {
    JOURNAL.with(|j| j.borrow().output.as_ptr())
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn delta_ack(token: u32, base: u64, result: u64) -> u32 {
    JOURNAL.with(|j| {
        let mut j = j.borrow_mut();
        if j.overflow
            || !j
                .batch
                .as_ref()
                .is_some_and(|b| b.token == token && b.base == base && b.result == result)
        {
            return 0;
        }
        j.durable = result;
        j.batch = None;
        1
    })
}
