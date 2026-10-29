//! Experimental metadata stream, not a production persistence format.
use super::{Engine, Points};
use std::{
    collections::{HashMap, HashSet},
    rc::Rc,
};

pub(super) struct Snapshot {
    pub metadata: Vec<u8>,
    pub sources: Vec<Rc<Points>>,
}
fn word(out: &mut Vec<u8>, value: usize) {
    out.extend_from_slice(&(value as u32).to_le_bytes());
}
fn number(out: &mut Vec<u8>, value: f64) {
    out.extend_from_slice(&value.to_le_bytes());
}
pub(super) fn capture(e: &Engine) -> Option<Snapshot> {
    // Bound the scan, including tombstones, before allocating projection maps.
    if e.strokes.len() > 100_000 || e.layers.len() > 4096 {
        return None;
    }
    let names: usize = e.layers.iter().map(|l| l.name.len()).sum();
    if names > 1_048_576 {
        return None;
    }
    let (originals, created) = e
        .slicing
        .as_ref()
        .map_or((&[][..], &[][..]), |g| g.save_projection());
    let originals: HashSet<_> = originals.iter().copied().collect();
    let created: HashSet<_> = created.iter().copied().collect();
    let moving: HashMap<_, _> = e.moving.iter().map(|m| (m.id, m.before)).collect();
    let live: Vec<_> = e
        .strokes
        .iter()
        .enumerate()
        .filter(|(id, s)| {
            Some(*id) != e.active
                && !created.contains(id)
                && (s.visible || originals.contains(id))
                && e.layers[s.layer].rank.is_some()
        })
        .collect();
    let mut out = b"LFS2".to_vec();
    word(&mut out, 1); // Experimental material/metadata encoding version.
    word(&mut out, e.layer_order.len());
    word(&mut out, live.len());
    for &id in &e.layer_order {
        let l = &e.layers[id];
        for v in [
            id,
            l.rank.unwrap(),
            l.visible as usize,
            l.locked as usize,
            l.default_name as usize,
            l.name.len(),
        ] {
            word(&mut out, v);
        }
        out.extend_from_slice(l.name.as_bytes());
    }
    let mut sources = Vec::new();
    let mut source_ids = HashMap::new();
    let mut groups = HashMap::new();
    let mut sample_count = 0usize;
    for (id, s) in live {
        let source = *source_ids.entry(Rc::as_ptr(&s.points)).or_insert_with(|| {
            let index = sources.len();
            sample_count += s.points.len();
            sources.push(Rc::clone(&s.points));
            index
        });
        if sample_count > 1_000_000 {
            return None;
        }
        let t =
            moving
                .get(&id)
                .copied()
                .unwrap_or([s.basis[0], s.basis[1], s.offset[0], s.offset[1]]);
        let key = (s.source, t.map(|v| if v == 0.0 { 0 } else { v.to_bits() }));
        let group = *groups.entry(key).or_insert(id);
        for v in [
            id,
            source,
            s.source,
            group,
            s.layer,
            s.brush as usize,
            s.color as usize,
            s.points.len(),
            s.slice.is_some() as usize,
        ] {
            word(&mut out, v);
        }
        for v in [
            s.width,
            s.pressure_curve.minimum,
            s.pressure_curve.gamma,
            s.opacity,
        ] {
            out.extend_from_slice(&v.to_le_bytes());
        }
        for v in s.slice.unwrap_or([0.0; 2]) {
            number(&mut out, v);
        }
        for a in s.source_anchor {
            out.extend_from_slice(&a.region.to_le_bytes());
            number(&mut out, a.local);
        }
        for v in t {
            number(&mut out, v);
        }
    }
    Some(Snapshot {
        metadata: out,
        sources,
    })
}
