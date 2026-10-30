//! Read-only checkpoint serialization from validated storage replay, not live editing state.
use super::{save_delta_wire as wire, save_replay_model::Model};
use std::ops::Bound::{Excluded, Unbounded};
pub(super) struct Checkpoint {
    ids: Vec<usize>,
    ready: bool,
    source_cursor: Option<usize>,
    phase: usize,
    descriptor: usize,
    layer: Option<usize>,
    stroke: Option<usize>,
    image: Option<usize>,
    pending: Vec<u8>,
    at: usize,
    next_chunk: usize,
    pub output: Vec<u8>,
}
impl Checkpoint {
    pub fn new() -> Self {
        Self {
            ids: vec![],
            ready: false,
            source_cursor: None,
            phase: 0,
            descriptor: 0,
            layer: None,
            stroke: None,
            image: None,
            pending: vec![],
            at: 0,
            next_chunk: 0,
            output: vec![],
        }
    }
    pub fn prepare(&mut self, m: &Model, budget: usize) -> Option<bool> {
        for _ in 0..budget {
            let key = if let Some(last) = self.source_cursor {
                m.sources.range((Excluded(last), Unbounded)).next()
            } else {
                m.sources.iter().next()
            };
            let Some((&id, _)) = key else {
                self.ready = true;
                return Some(true);
            };
            self.ids.try_reserve(1).ok()?;
            self.ids.push(id);
            self.source_cursor = Some(id);
        }
        Some(false)
    }
    pub fn count(&self) -> usize {
        if self.ready {
            self.ids.len() + 1
        } else {
            0
        }
    }
    fn record(&mut self, m: &Model) -> Option<Vec<u8>> {
        loop {
            let mut out = vec![];
            match self.phase {
                0 => {
                    out.extend_from_slice(b"LFC4");
                    wire::word(&mut out, 2);
                    wire::wide(&mut out, 0);
                    wire::wide(&mut out, m.revision);
                    wire::word(
                        &mut out,
                        m.layers.len() + m.strokes.len() + m.images.len() + 3,
                    );
                    wire::word(&mut out, self.ids.len());
                    self.phase = 1;
                }
                1 => {
                    if let Some(id) = self.ids.get(self.descriptor) {
                        wire::word(&mut out, *id);
                        wire::word(&mut out, m.sources.get(id)?.len());
                        self.descriptor += 1;
                    } else {
                        self.phase = 2;
                        continue;
                    }
                }
                2 => {
                    out.push(5);
                    #[cfg(feature = "save-app")]
                    for value in m.settings {
                        wire::word(&mut out, value as usize);
                    }
                    #[cfg(not(feature = "save-app"))]
                    {
                        wire::word(&mut out, 1);
                        wire::word(&mut out, 0);
                    }
                    self.phase = 3;
                }
                3 => {
                    let entry = if let Some(last) = self.layer {
                        m.layers.range((Excluded(last), Unbounded)).next()
                    } else {
                        m.layers.iter().next()
                    };
                    if let Some((&id, l)) = entry {
                        wire::layer(&mut out, id, l);
                        self.layer = Some(id);
                    } else {
                        self.phase = 4;
                        continue;
                    }
                }
                4 => {
                    out.push(4);
                    wire::word(&mut out, m.order.len());
                    for id in &m.order {
                        wire::word(&mut out, *id);
                    }
                    self.phase = 5;
                }
                5 => {
                    let entry = if let Some(last) = self.stroke {
                        m.strokes.range((Excluded(last), Unbounded)).next()
                    } else {
                        m.strokes.iter().next()
                    };
                    if let Some((&id, s)) = entry {
                        out.push(1);
                        out.extend(wire::stroke(id, s).bytes);
                        self.stroke = Some(id);
                    } else {
                        self.phase = 6;
                        continue;
                    }
                }
                6 => {
                    out.push(6);
                    wire::word(&mut out, m.high);
                    self.phase = 7;
                }
                7 => {
                    let entry = if let Some(last) = self.image {
                        m.images.range((Excluded(last), Unbounded)).next()
                    } else {
                        m.images.iter().next()
                    };
                    if let Some((&id, image)) = entry {
                        crate::image_save::encode(&mut out, crate::images::TAG + id, image);
                        self.image = Some(id);
                    } else {
                        self.phase = 8;
                        continue;
                    }
                }
                _ => return Some(vec![]),
            }
            if self.phase > 2 {
                let mut framed = vec![];
                wire::wide(&mut framed, m.revision);
                wire::word(&mut framed, out.len());
                framed.extend(out);
                return Some(framed);
            }
            return Some(out);
        }
    }
    pub fn chunk(&mut self, m: &Model, stream: usize, chunk: usize) -> Option<usize> {
        if !self.ready {
            return None;
        }
        self.output.clear();
        if stream > 0 {
            let points = m.sources.get(self.ids.get(stream - 1)?)?;
            wire::samples(points, chunk, &mut self.output)?;
        } else {
            if chunk != self.next_chunk {
                return None;
            }
            while self.output.len() < 65520 {
                if self.at == self.pending.len() {
                    self.pending = self.record(m)?;
                    self.at = 0;
                    if self.pending.is_empty() {
                        break;
                    }
                }
                let n = (65520 - self.output.len()).min(self.pending.len() - self.at);
                self.output
                    .extend_from_slice(&self.pending[self.at..self.at + n]);
                self.at += n;
            }
            self.next_chunk += 1;
        }
        Some(self.output.len())
    }
}
