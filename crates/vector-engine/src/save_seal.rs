//! SHA-256 over exact worker framing, at most one65520-byte chunk per call.
use super::{save_authority::CONTEXT, save_idle::IDLE, save_idle_stream};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::cell::RefCell;
pub(super) struct Seal {
    pub token: u32,
    pub base: u64,
    pub result: u64,
    pub request: Vec<u8>,
    hash: Sha256,
    context: Value,
    stream: usize,
    chunk: usize,
    streams: usize,
}
thread_local! {pub(super) static SEAL:RefCell<Option<Seal>>=const{RefCell::new(None)};}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn save_seal_begin(token: u32) -> u32 {
    let Some(context) = CONTEXT.with(|c| c.borrow().clone()) else {
        return 0;
    };
    let descriptor = IDLE.with(|s| {
        s.borrow()
            .active
            .as_ref()
            .filter(|b| b.token == token && b.remaining.is_empty())
            .map(|b| (b.base, b.result, b.sources.len + 1))
    });
    let Some((base, result, streams)) = descriptor else {
        return 0;
    };
    SEAL.with(|slot| {
        let mut slot = slot.borrow_mut();
        if let Some(s) = slot.as_ref() {
            return (s.token == token) as u32;
        }
        let mut hash = Sha256::new();
        hash.update((streams as u32).to_le_bytes());
        *slot = Some(Seal {
            token,
            base,
            result,
            streams,
            hash,
            context,
            stream: 0,
            chunk: 0,
            request: vec![],
        });
        1
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn save_seal_step(token: u32) -> u32 {
    SEAL.with(|slot| {
        let mut slot = slot.borrow_mut();
        let Some(s) = slot.as_mut().filter(|s| s.token == token) else {
            return 0;
        };
        if !s.request.is_empty() {
            return 2;
        }
        let length = IDLE.with(|state| {
            let state = state.borrow();
            let b = state.active.as_ref().filter(|b| b.token == token)?;
            if s.stream == 0 {
                Some(32 + b.sources.len * 8 + b.pending.len())
            } else {
                b.sources.get(s.stream - 1).map(|(_, p)| p.len() * 40)
            }
        });
        let Some(length) = length else {
            return 0;
        };
        let size = save_idle_stream::idle_chunk(token, s.stream, s.chunk);
        if size == usize::MAX {
            return 0;
        }
        if s.chunk == 0 {
            s.hash.update((length as u32).to_le_bytes());
        }
        IDLE.with(|state| s.hash.update(&state.borrow().output));
        if size < 65520 || (s.chunk + 1) * 65520 == length {
            s.stream += 1;
            s.chunk = 0;
        } else {
            s.chunk += 1;
        }
        if s.stream < s.streams {
            return 1;
        }
        let digest = s.hash.clone().finalize();
        let hex = digest
            .iter()
            .map(|b| format!("{b:02x}"))
            .collect::<String>();
        let mut request = s.context.as_object().unwrap().clone();
        let session = request.remove("session").unwrap();
        request.insert(
            "operation".into(),
            Value::String(format!("{}_{token}", session.as_str().unwrap())),
        );
        request.insert("base".into(), Value::String(s.base.to_string()));
        request.insert("result".into(), Value::String(s.result.to_string()));
        request.insert("digest".into(), Value::String(hex));
        s.request = serde_json::to_vec(&request).unwrap();
        2
    })
}
