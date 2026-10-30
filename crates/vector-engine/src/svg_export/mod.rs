//! Immutable export capture shared by native and Wasm hosts.
use crate::{geometry_wide, regional::Address, Engine, Points, Stroke, ENGINE};
use std::{
    cell::RefCell,
    collections::{BTreeMap, BTreeSet},
    rc::Rc,
};
mod boundary;
mod contract;
mod images;
mod state;
mod texts;
use state::Job;
mod measure;
mod png;
mod png_validate;
mod retire;
mod stream;
mod xml;
type Key = (usize, usize, usize, usize);
type Group = (usize, usize, usize, u32, u32, u32, u64);
pub(super) struct Item {
    id: usize,
    rank: usize,
    stroke: Stroke,
}
impl Item {
    fn group(&self) -> Group {
        let s = &self.stroke;
        (
            self.rank,
            s.source,
            s.blend_group,
            s.brush,
            s.color,
            s.opacity.to_bits(),
            (f64::from(s.width) * s.basis[0].hypot(s.basis[1])).to_bits(),
        )
    }
}
#[derive(Default)]
struct State {
    generation: u32,
    job: Option<Job>,
}
thread_local! { static STATE: RefCell<State> = RefCell::new(State::default()); }
fn revision() -> u64 {
    crate::save_delta::JOURNAL.with(|j| j.borrow().revision)
}
fn busy(e: &Engine) -> bool {
    e.active.is_some() || !e.moving.is_empty() || !e.deleting.is_empty() || e.slicing.is_some()
}
/// 0 rejects an active interaction, another retained job, or token exhaustion.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn svg_begin() -> u32 {
    STATE.with(|state| {
        let mut state = state.borrow_mut();
        if state.job.is_some() {
            return 0;
        }
        ENGINE.with(|e| {
            let e = e.borrow();
            if busy(&e) {
                return 0;
            }
            let Some(token) = state.generation.checked_add(1) else {
                return 0;
            };
            state.generation = token;
            state.job = Some(Job {
                token,
                revision: revision(),
                cursor: 0,
                count: e.strokes.len(),
                image_count: e.images.len(),
                text_count: e.texts.len(),
                text_cursor: 0,
                texts: BTreeMap::new(),
                text_content: None,
                image_cursor: 0,
                images: BTreeMap::new(),
                image_digest: [0; 64],
                image_ids: BTreeMap::new(),
                state: 1,
                items: BTreeMap::new(),
                current: None,
                sources: BTreeSet::new(),
                retained: 0,
                retired: Vec::new(),
                dropping: None,
                origin: None,
                settings: e.settings,
                tolerance: None,
                chunk: 0,
                consumed: 0,
                scratch: Default::default(),
                output: Vec::with_capacity(6168),
                layout: Default::default(),
                xml: Default::default(),
                error: 0,
                group_last: false,
            });
            token
        })
    })
}
/// 1 preparing, 2 sealed, 3 exhausted, 4 retiring, 5 failed. At most64 metadata copies.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn svg_prepare(token: u32) -> u32 {
    STATE.with(|s| {
        let mut s = s.borrow_mut();
        let Some(j) = s.job.as_mut().filter(|j| j.token == token) else {
            return 0;
        };
        if j.state != 1 {
            return j.state;
        }
        ENGINE.with(|e| {
            let e = e.borrow();
            if busy(&e) || revision() != j.revision || e.strokes.len() != j.count {
                j.state = 5;
                return;
            }
            if j.text_cursor < j.text_count {
                texts::capture(j, &e);
                return;
            }
            if j.image_cursor < j.image_count {
                images::capture(j, &e);
                return;
            }
            let end = (j.cursor + 64).min(j.count);
            for id in j.cursor..end {
                let stroke = &e.strokes[id];
                if !e.stroke_visible(id) || stroke.opacity <= 0.0 || stroke.points.is_empty() {
                    continue;
                }
                if j.items.len() >= 100_000 {
                    j.state = 5;
                    j.error = 6;
                    return;
                }
                if j.sources.insert(stroke.source) {
                    let Some(bytes) = stroke
                        .points
                        .len()
                        .checked_mul(std::mem::size_of::<crate::Point>())
                    else {
                        j.state = 5;
                        j.error = 6;
                        return;
                    };
                    j.retained = j.retained.saturating_add(bytes);
                    if j.retained > 128 * 1024 * 1024 {
                        j.state = 5;
                        j.error = 6;
                        return;
                    }
                }
                j.origin.get_or_insert(stroke.source_anchor);
                let rank = e.layers[stroke.layer].rank.unwrap();
                j.items.insert(
                    (rank, stroke.source, stroke.blend_group, id),
                    Item {
                        id,
                        rank,
                        stroke: stroke.clone(),
                    },
                );
            }
            j.cursor = end;
            if end == j.count {
                j.state = 2;
            }
        });
        j.state
    })
}

pub(crate) fn owned() -> bool {
    STATE.with(|s| s.borrow().job.is_some())
}
