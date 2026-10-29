//! Curve-domain edits. Fragments share accepted samples and retain the original
//! cubic spans; cutting never fits a replacement curve or edits raw pressure.
use super::{geometry, layers::Command, Engine, Stroke, ENGINE};
use std::collections::HashMap;
use std::rc::Rc;

pub(super) struct Gesture {
    radius: f64,
    layer: Option<usize>,
    path: Vec<[f64; 2]>,
    // Only live candidates are revisited; intermediate fragments are released.
    candidates: Vec<usize>,
    originals: Vec<usize>,
    owners: HashMap<usize, usize>,
    created: Vec<usize>,
}
pub(super) struct Replacement {
    pub original: usize,
    pub fragments: Vec<usize>,
}
const EPS: f64 = 1e-8;
type Curve = [[f64; 2]; 4];
fn eval(c: Curve, t: f64) -> [f64; 2] {
    let u = 1.0 - t;
    std::array::from_fn(|i| {
        c[0][i] * u * u * u
            + 3.0 * c[1][i] * u * u * t
            + 3.0 * c[2][i] * u * t * t
            + c[3][i] * t * t * t
    })
}
fn dot(a: [f64; 2], b: [f64; 2]) -> f64 {
    a[0] * b[0] + a[1] * b[1]
}
fn sub(a: [f64; 2], b: [f64; 2]) -> [f64; 2] {
    [a[0] - b[0], a[1] - b[1]]
}
fn distance_squared(p: [f64; 2], a: [f64; 2], b: [f64; 2]) -> f64 {
    let d = sub(b, a);
    let l = dot(d, d);
    let t = if l > 0.0 {
        (dot(sub(p, a), d) / l).clamp(0.0, 1.0)
    } else {
        0.0
    };
    let v = sub(p, [a[0] + t * d[0], a[1] + t * d[1]]);
    dot(v, v)
}
// Isolate roots directly in Bernstein form. Convex-hull rejection is cheap;
// subdivision handles tangencies and multiple crossings without zoom-dependent
// flattening. An identically zero polynomial is handled by its caller.
fn roots(values: &[f64], lo: f64, hi: f64, depth: u32, out: &mut Vec<f64>) {
    let min = values.iter().copied().fold(f64::INFINITY, f64::min);
    let max = values.iter().copied().fold(f64::NEG_INFINITY, f64::max);
    if min > 0.0 || max < 0.0 || max - min < 1e-14 {
        return;
    }
    if depth == 32 || hi - lo < EPS {
        out.push((lo + hi) * 0.5);
        return;
    }
    let n = values.len();
    let mut work = [0.0; 7];
    let mut left = [0.0; 7];
    let mut right = [0.0; 7];
    work[..n].copy_from_slice(values);
    left[0] = work[0];
    right[n - 1] = work[n - 1];
    for k in 1..n {
        for i in 0..n - k {
            work[i] = (work[i] + work[i + 1]) * 0.5;
        }
        left[k] = work[0];
        right[n - 1 - k] = work[n - 1 - k];
    }
    let mid = (lo + hi) * 0.5;
    roots(&left[..n], lo, mid, depth + 1, out);
    roots(&right[..n], mid, hi, depth + 1, out);
}
fn circle_roots(c: Curve, center: [f64; 2], radius: f64, out: &mut Vec<f64>) {
    const C3: [f64; 4] = [1.0, 3.0, 3.0, 1.0];
    const C6: [f64; 7] = [1.0, 6.0, 15.0, 20.0, 15.0, 6.0, 1.0];
    let p = c.map(|p| sub(p, center));
    let mut values = [-radius * radius; 7];
    for i in 0..4 {
        for j in 0..4 {
            values[i + j] += dot(p[i], p[j]) * C3[i] * C3[j] / C6[i + j];
        }
    }
    roots(&values, 0.0, 1.0, 0, out);
}
fn crossings(c: Curve, a: [f64; 2], b: [f64; 2], radius: f64) -> Vec<[f64; 2]> {
    // The control hull is conservative even for corners and looping cubics.
    for axis in 0..2 {
        let min = c.iter().map(|p| p[axis]).fold(f64::INFINITY, f64::min);
        let max = c.iter().map(|p| p[axis]).fold(f64::NEG_INFINITY, f64::max);
        if max < a[axis].min(b[axis]) - radius || min > a[axis].max(b[axis]) + radius {
            return vec![];
        }
    }
    let d = sub(b, a);
    let length = d[0].hypot(d[1]);
    let mut cuts = vec![0.0, 1.0];
    if length > 0.0 {
        let n = [-d[1] / length, d[0] / length];
        let signed = c.map(|p| dot(sub(p, a), n));
        if radius == 0.0 {
            let mut hits = vec![];
            if signed.iter().all(|v| v.abs() < 1e-10) {
                // Collinear knife motion splits at the swept interval ends.
                for target in [0.0, length * length] {
                    roots(
                        &c.map(|p| dot(sub(p, a), d) - target),
                        0.0,
                        1.0,
                        0,
                        &mut hits,
                    );
                }
            } else {
                roots(&signed, 0.0, 1.0, 0, &mut hits);
            }
            hits.retain(|&t| {
                let along = dot(sub(eval(c, t), a), d);
                along >= -EPS * (1.0 + length * length)
                    && along <= length * length + EPS * (1.0 + length * length)
            });
            hits.sort_by(f64::total_cmp);
            hits.dedup_by(|a, b| (*a - *b).abs() < EPS * 2.0);
            return hits.into_iter().map(|t| [t, t]).collect();
        }
        for sign in [-1.0, 1.0] {
            roots(&signed.map(|v| v - sign * radius), 0.0, 1.0, 0, &mut cuts);
        }
    } else if radius == 0.0 {
        return vec![];
    }
    circle_roots(c, a, radius, &mut cuts);
    if length > 0.0 {
        circle_roots(c, b, radius, &mut cuts);
    }
    cuts.sort_by(f64::total_cmp);
    cuts.dedup_by(|a, b| (*a - *b).abs() < EPS);
    cuts.windows(2)
        .filter_map(|w| {
            (distance_squared(eval(c, (w[0] + w[1]) * 0.5), a, b) < radius * radius)
                .then_some([w[0], w[1]])
        })
        .collect()
}
fn surviving(stroke: &Stroke, gesture: &Gesture) -> Option<Vec<[f64; 2]>> {
    let [lo, hi] = stroke
        .slice
        .unwrap_or([0.0, stroke.points.len().saturating_sub(1) as f64]);
    let project = |p: [f32; 3]| {
        let [a, b] = stroke.basis;
        [
            a * p[0] as f64 - b * p[1] as f64 + stroke.offset[0],
            b * p[0] as f64 + a * p[1] as f64 + stroke.offset[1],
        ]
    };
    if lo == hi {
        if gesture.radius == 0.0 {
            return None;
        }
        let p = project(stroke.source_point(0));
        let hit = gesture.path.iter().enumerate().any(|(i, &b)| {
            distance_squared(p, gesture.path[i.saturating_sub(1)], b)
                < gesture.radius * gesture.radius
        });
        return hit.then(Vec::new);
    }
    let mut removed = Vec::new();
    for span in lo.floor() as usize..hi.ceil() as usize {
        let curve = geometry::source_span(stroke, span + 1).map(project);
        for (i, &b) in gesture.path.iter().enumerate() {
            let a = gesture.path[i.saturating_sub(1)];
            for [a, b] in crossings(curve, a, b, gesture.radius) {
                let a = (span as f64 + a).max(lo);
                let b = (span as f64 + b).min(hi);
                if b >= a && b > lo + EPS && a < hi - EPS {
                    removed.push([a, b]);
                }
            }
        }
    }
    if removed.is_empty() {
        return None;
    }
    removed.sort_by(|a, b| a[0].total_cmp(&b[0]));
    let mut result = vec![];
    let mut next = lo;
    for [a, b] in removed {
        if a > next + EPS {
            result.push([next, a]);
        }
        next = next.max(b);
    }
    if next < hi - EPS {
        result.push([next, hi]);
    }
    Some(result)
}
impl Engine {
    pub(super) fn refresh_blend_groups(&mut self) {
        let mut groups = HashMap::new();
        for (id, s) in self.strokes.iter_mut().enumerate() {
            let key = (
                s.source,
                s.basis.map(|v| if v == 0.0 { 0 } else { v.to_bits() }),
                s.offset.map(|v| if v == 0.0 { 0 } else { v.to_bits() }),
            );
            s.blend_group = *groups.entry(key).or_insert(id);
        }
    }
    fn begin_slice(&mut self, width: f64, active_only: bool) -> bool {
        self.cancel();
        if !width.is_finite() || !(0.0..=500.0).contains(&width) {
            return false;
        }
        self.slicing = Some(Gesture {
            radius: width * 0.5,
            layer: active_only.then_some(self.active_layer),
            path: vec![],
            candidates: (0..self.strokes.len())
                .filter(|&id| {
                    self.stroke_visible(id) && !self.layers[self.strokes[id].layer].locked
                })
                .collect(),
            originals: vec![],
            owners: HashMap::new(),
            created: vec![],
        });
        true
    }
    fn push_slice(&mut self, x: f64, y: f64) -> usize {
        if !x.is_finite() || !y.is_finite() || x.abs() > 1e9 || y.abs() > 1e9 {
            return 0;
        }
        let Some(mut g) = self.slicing.take() else {
            return 0;
        };
        let p = [x, y];
        if g.path.last() == Some(&p) {
            self.slicing = Some(g);
            return 0;
        }
        let last = g.path.last().copied().unwrap_or(p);
        g.path.clear();
        g.path.extend([last, p]);
        let candidates = std::mem::take(&mut g.candidates);
        let mut changed = 0;
        for original in candidates {
            let s = &self.strokes[original];
            let ranges = if self.stroke_visible(original)
                && !self.layers[s.layer].locked
                && !s.points.is_empty()
                && !g.layer.is_some_and(|l| s.layer != l)
            {
                surviving(s, &g)
            } else {
                None
            };
            let Some(ranges) = ranges else {
                g.candidates.push(original);
                continue;
            };
            let owner = if let Some(&owner) = g.owners.get(&original) {
                owner
            } else {
                g.originals.push(original);
                original
            };
            for range in ranges {
                let s = &self.strokes[original];
                let fragment = Stroke {
                    points: Rc::clone(&s.points),
                    slice: Some(range),
                    source: s.source,
                    blend_group: s.blend_group,
                    width: s.width,
                    pressure_curve: s.pressure_curve,
                    color: s.color,
                    opacity: s.opacity,
                    brush: s.brush,
                    visible: true,
                    layer: s.layer,
                    offset: s.offset,
                    basis: s.basis,
                };
                let id = self.strokes.len();
                self.strokes.push(fragment);
                g.owners.insert(id, owner);
                g.created.push(id);
                g.candidates.push(id);
            }
            self.strokes[original].visible = false;
            if g.owners.contains_key(&original) {
                self.strokes[original].points = Default::default();
                self.strokes[original].slice = None;
            }
            changed += 1;
        }
        if changed > 0 {
            self.refresh_blend_groups();
            self.layer_render_revision = self.layer_render_revision.wrapping_add(1);
        }
        self.slicing = Some(g);
        changed
    }
    pub(super) fn cancel_slice(&mut self) {
        if let Some(g) = self.slicing.take() {
            for &id in &g.originals {
                self.strokes[id].visible = true;
            }
            for id in g.created {
                let s = &mut self.strokes[id];
                s.visible = false;
                s.points = Default::default();
                s.slice = None;
            }
            if !g.originals.is_empty() {
                self.refresh_blend_groups();
                self.layer_render_revision = self.layer_render_revision.wrapping_add(1);
            }
        }
    }
    fn commit_slice(&mut self) -> usize {
        let Some(g) = self.slicing.take() else {
            return 0;
        };
        // Flatten the entire gesture into original -> final fragments. Intermediate
        // pieces never enter history and never retain duplicate raw sample arrays.
        let mut fragments: HashMap<usize, Vec<usize>> = HashMap::new();
        for id in g.created {
            if self.strokes[id].visible {
                fragments.entry(g.owners[&id]).or_default().push(id);
            }
        }
        let changes: Vec<_> = g
            .originals
            .into_iter()
            .map(|original| Replacement {
                original,
                fragments: fragments.remove(&original).unwrap_or_default(),
            })
            .collect();
        let changed = changes.len();
        if changed > 0 {
            self.record(Command::Slice(changes));
        }
        changed
    }
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn slice_begin(width: f64, active_only: u32) -> u32 {
    ENGINE.with(|e| e.borrow_mut().begin_slice(width, active_only != 0) as u32)
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn slice_push(x: f64, y: f64) -> usize {
    ENGINE.with(|e| e.borrow_mut().push_slice(x, y))
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn slice_commit() -> usize {
    ENGINE.with(|e| e.borrow_mut().commit_slice())
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn stroke_order(id: usize) -> usize {
    ENGINE.with(|e| e.borrow().strokes[id].source)
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn stroke_blend_group(id: usize) -> usize {
    ENGINE.with(|e| e.borrow().strokes[id].blend_group)
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn raw_length(id: usize) -> usize {
    ENGINE.with(|e| e.borrow().strokes.get(id).map_or(0, |s| s.points.len()))
}

#[cfg(test)]
mod tests {
    use super::*;
    fn line(e: &mut Engine, y: f32) -> usize {
        let id = e.begin_with_style(
            6.0,
            0x123456,
            super::super::PressureCurve::new(0.05, 1.8),
            0.4,
        );
        e.push(0.0, y, 0.2);
        e.push(100.0, y, 0.9);
        e.commit();
        id
    }
    fn cut(e: &mut Engine, width: f64, x: f64) -> usize {
        assert!(e.begin_slice(width, false));
        e.push_slice(x, -50.0);
        e.push_slice(x, 50.0);
        e.commit_slice()
    }
    fn raw(e: &Engine, id: usize) -> Vec<[u64; 5]> {
        (0..e.strokes[id].points.len())
            .map(|i| {
                let p = e.strokes[id].points[i];
                p.canonical_bits()
            })
            .collect()
    }
    #[test]
    fn zero_split_shares_raw_and_preserves_style_order_union_and_history() {
        let mut e = Engine::default();
        let id = line(&mut e, 0.0);
        let before = raw(&e, id);
        let history = e.undo.len();
        assert_eq!(cut(&mut e, 0.0, 50.0), 1);
        assert_eq!(e.undo.len(), history + 1);
        assert!(!e.stroke_visible(id));
        assert!(e.stroke_visible(1) && e.stroke_visible(2));
        for id in [1, 2] {
            assert!(Rc::ptr_eq(&e.strokes[0].points, &e.strokes[id].points));
            assert_eq!(raw(&e, id), before);
            assert_eq!(e.strokes[id].opacity, 0.4);
            assert_eq!(e.strokes[id].source, 0);
            assert_eq!(e.strokes[id].blend_group, 0);
        }
        let a = e.strokes[1].slice.unwrap();
        let b = e.strokes[2].slice.unwrap();
        assert!((a[1] - 0.5).abs() < EPS * 2.0);
        assert_eq!(a[1], b[0]);
        for _ in 0..3 {
            e.undo();
            assert!(e.stroke_visible(0) && !e.stroke_visible(1));
            e.redo();
            assert!(!e.stroke_visible(0) && e.stroke_visible(2));
        }
        assert_eq!(raw(&e, 0), before);
        e.strokes[1].offset = [10.0, 20.0];
        e.refresh_blend_groups();
        assert_ne!(e.strokes[1].blend_group, e.strokes[2].blend_group);
    }
    #[test]
    fn positive_width_removes_centerline_interval_and_repeated_cuts_do_not_regrow_it() {
        let mut e = Engine::default();
        line(&mut e, 0.0);
        assert_eq!(cut(&mut e, 20.0, 50.0), 1);
        assert!((e.strokes[1].slice.unwrap()[1] - 0.4).abs() < 1e-6);
        assert!((e.strokes[2].slice.unwrap()[0] - 0.6).abs() < 1e-6);
        assert_eq!(cut(&mut e, 20.0, 50.0), 0);
        assert_eq!(cut(&mut e, 0.0, 20.0), 1);
        assert_eq!(e.strokes.iter().filter(|s| s.visible).count(), 3);
        e.undo();
        assert!(e.stroke_visible(1) && e.stroke_visible(2));
        e.undo();
        assert!(e.stroke_visible(0));
        e.redo();
        assert!(!e.stroke_visible(0));
    }
    #[test]
    fn multiple_strokes_and_multiple_crossings_are_one_command() {
        let mut e = Engine::default();
        line(&mut e, 0.0);
        line(&mut e, 20.0);
        let history = e.undo.len();
        e.begin_slice(0.0, false);
        for [x, y] in [[20.0, -10.0], [20.0, 30.0], [80.0, 30.0], [80.0, -10.0]] {
            e.push_slice(x, y);
        }
        assert_eq!(e.commit_slice(), 2);
        assert_eq!(e.undo.len(), history + 1);
        assert_eq!(e.strokes.iter().filter(|s| s.visible).count(), 6);
        e.undo();
        assert_eq!(e.strokes.iter().filter(|s| s.visible).count(), 2);
    }
    #[test]
    fn transformed_stroke_uses_world_width_and_retains_exact_curve_spans() {
        let mut e = Engine::default();
        let id = e.begin(8.0, 0);
        for [x, y] in [
            [0.0, 0.0],
            [25.0, 15.0],
            [50.0, 0.0],
            [75.0, -15.0],
            [100.0, 0.0],
        ] {
            e.push(x, y, 0.7);
        }
        e.commit();
        let original = geometry::source_span(&e.strokes[id], 2);
        let before = raw(&e, id);
        e.strokes[id].basis = [0.0, 2.0];
        e.strokes[id].offset = [40.0, 10.0];
        e.begin_slice(0.0, false);
        e.push_slice(-100.0, 80.0);
        e.push_slice(100.0, 80.0);
        assert_eq!(e.commit_slice(), 1);
        assert_eq!(raw(&e, id), before);
        let child = &e.strokes[1];
        assert_eq!(child.basis, [0.0, 2.0]);
        let t = child.slice.unwrap()[1] - 1.0;
        let clipped = geometry::span(child, child.sample_count() - 1);
        for i in 0..=100 {
            let u = i as f64 / 100.0;
            let a = geometry::evaluate(original, u * t);
            let b = geometry::evaluate(clipped, u);
            for k in 0..3 {
                assert!((a[k] - b[k]).abs() < 2e-5);
            }
        }
    }
    #[test]
    fn noops_protection_cancel_invalid_input_and_redo_branch_are_safe() {
        let mut e = Engine::default();
        line(&mut e, 0.0);
        line(&mut e, 10.0);
        e.undo();
        let before = raw(&e, 0);
        assert_eq!(cut(&mut e, 0.0, 200.0), 0);
        assert_eq!(e.redo.len(), 1);
        e.layers[0].locked = true;
        assert_eq!(cut(&mut e, 20.0, 50.0), 0);
        e.layers[0].locked = false;
        e.layers[0].visible = false;
        assert_eq!(cut(&mut e, 20.0, 50.0), 0);
        e.layers[0].visible = true;
        e.begin_slice(20.0, false);
        e.push_slice(50.0, 0.0);
        e.cancel();
        assert_eq!(e.commit_slice(), 0);
        assert_eq!(e.redo.len(), 1);
        for width in [-1.0, 501.0, f64::NAN] {
            assert!(!e.begin_slice(width, false));
        }
        assert_eq!(cut(&mut e, 20.0, 50.0), 1);
        e.undo();
        let discarded = e.strokes.len();
        line(&mut e, 30.0);
        assert!(e.redo.is_empty());
        assert_eq!(raw(&e, 0), before);
        for s in &e.strokes[2..discarded] {
            assert!(s.points.is_empty());
        }
    }
    #[test]
    fn circles_dabs_collinear_knife_and_curve_multiple_roots() {
        let mut e = Engine::default();
        let id = e.begin(8.0, 0);
        e.push(50.0, 0.0, 0.5);
        e.commit();
        assert_eq!(cut(&mut e, 0.0, 50.0), 0);
        e.begin_slice(20.0, false);
        e.push_slice(50.0, 0.0);
        assert_eq!(e.commit_slice(), 1);
        assert!(!e.stroke_visible(id));
        e.undo();
        assert!(e.stroke_visible(id));
        let c = [
            [0.0, 0.0],
            [100.0 / 3.0, 0.0],
            [200.0 / 3.0, 0.0],
            [100.0, 0.0],
        ];
        let hits = crossings(c, [50.0, 0.0], [50.0, 0.0], 10.0);
        assert_eq!(hits.len(), 1);
        assert!((hits[0][0] - 0.4).abs() < 1e-6);
        assert!((hits[0][1] - 0.6).abs() < 1e-6);
        let hits = crossings(c, [20.0, 0.0], [80.0, 0.0], 0.0);
        assert_eq!(hits.len(), 2);
        let c = [[0.0, -1.0], [33.0, 3.0], [66.0, -3.0], [100.0, 1.0]];
        assert_eq!(crossings(c, [-1.0, 0.0], [101.0, 0.0], 0.0).len(), 3);
    }
    #[test]
    fn fragmented_worker_payload_matches_synchronous_geometry_across_chunks() {
        ENGINE.with(|e| *e.borrow_mut() = Engine::default());
        super::super::begin_with_style(8.0, 0, 0.05, 1.8, 0.4);
        for i in 0..300 {
            super::super::push(
                i as f32,
                (i as f32 * 0.1).sin() * 20.0,
                (i % 7) as f32 / 6.0,
            );
        }
        super::super::commit();
        slice_begin(0.0, 0);
        slice_push(70.4, -100.0);
        slice_push(70.4, 100.0);
        assert_eq!(slice_commit(), 1);
        for id in [1, 2] {
            for chunk in 0..super::super::length(id).div_ceil(128) {
                for tolerance in [0.0005, 0.25, 4.0] {
                    super::super::render_chunk(id, chunk, tolerance);
                    let expected = super::super::GEOMETRY.with(|g| g.borrow().output.clone());
                    let n = super::super::geometry_snapshot(id, chunk);
                    super::super::render_snapshot(n, tolerance);
                    let actual = super::super::GEOMETRY.with(|g| g.borrow().output.clone());
                    assert_eq!(expected, actual);
                }
            }
        }
    }
    #[test]
    fn live_updates_flatten_history_and_cancel_restores_all_originals() {
        let mut e = Engine::default();
        line(&mut e, 0.0);
        let saved = raw(&e, 0);
        let history = e.undo.len();
        e.begin_slice(12.0, false);
        e.push_slice(20.0, -20.0);
        assert_eq!(e.push_slice(20.0, 0.0), 1);
        assert!(!e.stroke_visible(0));
        assert_eq!(e.undo.len(), history);
        for x in 21..=70 {
            e.push_slice(x as f64, 0.0);
        }
        let live: Vec<_> = e
            .strokes
            .iter()
            .enumerate()
            .filter_map(|(i, s)| s.visible.then_some(i))
            .collect();
        assert_eq!(live.len(), 2);
        let retained = e.strokes.iter().filter(|s| !s.points.is_empty()).count();
        assert_eq!(retained, 3);
        assert_eq!(e.commit_slice(), 1);
        assert_eq!(e.undo.len(), history + 1);
        for _ in 0..3 {
            e.undo();
            assert!(e.stroke_visible(0));
            assert_eq!(e.strokes.iter().filter(|s| s.visible).count(), 1);
            e.redo();
            assert!(live.iter().all(|&id| e.stroke_visible(id)));
        }
        assert_eq!(raw(&e, 0), saved);
        e.undo();
        e.begin_slice(40.0, false);
        e.push_slice(50.0, 0.0);
        assert!(!e.stroke_visible(0));
        e.cancel();
        assert!(e.stroke_visible(0));
        assert_eq!(e.redo.len(), 1);
        assert_eq!(raw(&e, 0), saved);
        e.redo();
        assert!(live.iter().all(|&id| e.stroke_visible(id)));
    }
}
