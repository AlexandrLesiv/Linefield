//! Checkpoint-only delta records. All sizes and integer fields are little endian.
use super::{layers::Layer, Points, Stroke};
use std::rc::Rc;
#[derive(Clone)]
pub(super) struct SavedStroke {
    pub source: usize,
    pub layer: usize,
    pub points: Rc<Points>,
    pub bytes: Vec<u8>,
}
pub(super) fn word(out: &mut Vec<u8>, n: usize) {
    out.extend_from_slice(&(n as u32).to_le_bytes());
}
pub(super) fn wide(out: &mut Vec<u8>, n: u64) {
    out.extend_from_slice(&n.to_le_bytes());
}
pub(super) fn stroke(id: usize, s: &Stroke) -> SavedStroke {
    let mut out = vec![];
    for n in [
        id,
        s.source,
        s.layer,
        s.brush as usize,
        s.color as usize,
        s.slice.is_some() as usize,
    ] {
        word(&mut out, n);
    }
    for n in [
        s.width,
        s.pressure_curve.minimum,
        s.pressure_curve.gamma,
        s.opacity,
    ] {
        out.extend_from_slice(&n.to_le_bytes());
    }
    for n in s.slice.unwrap_or([0.0; 2]) {
        out.extend_from_slice(&n.to_le_bytes());
    }
    for a in s.source_anchor {
        out.extend_from_slice(&a.region.to_le_bytes());
        out.extend_from_slice(&a.local.to_le_bytes());
    }
    for n in [s.basis[0], s.basis[1], s.offset[0], s.offset[1]] {
        out.extend_from_slice(&n.to_le_bytes());
    }
    SavedStroke {
        source: s.source,
        layer: s.layer,
        points: Rc::clone(&s.points),
        bytes: out,
    }
}
pub(super) fn layer(out: &mut Vec<u8>, id: usize, l: &Layer) {
    out.push(3);
    for n in [
        id,
        l.visible as usize,
        l.locked as usize,
        l.default_name as usize,
        l.name.len(),
    ] {
        word(out, n);
    }
    out.extend_from_slice(l.name.as_bytes());
}
pub(super) fn samples(points: &Points, chunk: usize, out: &mut Vec<u8>) -> Option<()> {
    let start = chunk.checked_mul(1638)?;
    if start > points.len() {
        return None;
    }
    for i in start..(start + 1638).min(points.len()) {
        let p = points[i];
        for a in [p.x, p.y] {
            out.extend_from_slice(&a.region.to_le_bytes());
            out.extend_from_slice(&a.local.to_le_bytes());
        }
        out.extend_from_slice(&p.pressure.to_le_bytes());
        word(out, 0);
    }
    Some(())
}
