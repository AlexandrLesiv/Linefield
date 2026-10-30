//! Immutable metadata is reread after directly decoding raw source streams.
use super::{save_decode::Read, save_replay_model::Model, save_replay_scan::Scan, Point, Points};
use sha2::{Digest, Sha256};
use std::rc::Rc;
pub(super) struct Batch {
    pub base: u64,
    pub result: u64,
    streams: usize,
    scan: Scan,
    hash: Sha256,
    first_hash: Option<[u8; 32]>,
    sources: Vec<(usize, usize)>,
    current: usize,
    points: Points,
    partial: Vec<u8>,
    second: bool,
}
impl Batch {
    pub fn new(streams: usize, base: u64, result: u64) -> Self {
        Self {
            base,
            result,
            streams,
            scan: Scan::default(),
            hash: Sha256::new(),
            first_hash: None,
            sources: vec![],
            current: 1,
            points: Points::default(),
            partial: vec![],
            second: false,
        }
    }
    fn descriptors(&mut self, _model: &Model) -> Option<()> {
        if self.first_hash.is_some() {
            return Some(());
        }
        if !self.scan.done {
            return None;
        }
        self.sources = std::mem::take(&mut self.scan.sources);
        self.first_hash = Some(self.hash.clone().finalize().into());
        Some(())
    }
    pub fn append(&mut self, stream: usize, bytes: &[u8], model: &mut Model) -> Option<()> {
        if stream == 0 {
            if !self.second && self.first_hash.is_some() {
                return None;
            }
            self.hash.update(bytes);
            return self.scan.append(
                bytes,
                self.base,
                self.result,
                self.streams,
                self.second,
                model,
            );
        }
        if !self.second && bytes.is_empty() && stream + 1 == self.current {
            return Some(());
        }
        if self.second || stream != self.current || stream >= self.streams {
            return None;
        }
        self.descriptors(model)?;
        let (id, count) = *self.sources.get(stream - 1)?;
        self.partial.extend_from_slice(bytes);
        let mut r = Read {
            bytes: &self.partial,
            at: 0,
        };
        while r.bytes.len() - r.at >= 40 {
            if self.points.len() >= count {
                return None;
            }
            let x = r.address()?;
            let y = r.address()?;
            let pressure = r.float()?;
            if !(0.0..=1.0).contains(&pressure) || r.word()? != 0 {
                return None;
            }
            self.points.try_push(Point { x, y, pressure })?;
        }
        let consumed = r.at;
        self.partial.drain(..consumed);
        if self.points.len() == count {
            if !self.partial.is_empty() {
                return None;
            }
            model.add_source(id, Rc::new(std::mem::take(&mut self.points)))?;
            self.current += 1;
        }
        Some(())
    }
    pub fn replay(&mut self, model: &Model) -> Option<()> {
        if self.second {
            return None;
        }
        self.descriptors(model)?;
        if self.current != self.streams || !self.partial.is_empty() {
            return None;
        }
        self.second = true;
        self.scan = Scan::default();
        self.hash = Sha256::new();
        Some(())
    }
    pub fn finish(&self, model: &mut Model) -> Option<()> {
        if !self.second
            || !self.scan.done
            || self.scan.sources != self.sources
            || Some(<[u8; 32]>::from(self.hash.clone().finalize())) != self.first_hash
        {
            return None;
        }
        model.finish(self.result)
    }
    pub fn retire(&mut self, budget: usize) -> bool {
        for _ in 0..budget {
            if self.points.blocks.pop().is_none() {
                return true;
            }
        }
        false
    }
}
