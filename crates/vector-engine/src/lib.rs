use std::{cell::RefCell, rc::Rc};
mod boundary_generated;
mod geometry;
mod geometry_wide;
pub mod geometry_wide_transport;
pub mod geometry_wide_snapshot;
/// Generated scalar ABI shape identity, checked once by host and worker loaders.
/// This is not a trust signature or a document-format version.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn boundary_fingerprint_word(index: usize) -> u32 {
    boundary_generated::ABI_FINGERPRINT
        .get(index)
        .copied()
        .unwrap_or(0)
}
pub mod camera;
pub mod layers;
pub mod regional;
pub mod selection;
pub mod selection_query;
pub mod picking;
pub mod lasso;
mod lasso_math;
pub mod slice;
use layers::{Command, Layer};
#[cfg(not(target_arch = "wasm32"))]
pub mod native;
#[derive(Clone, Copy)]
struct Point {
    x: regional::Address,
    y: regional::Address,
    pressure: f32,
}
impl Point {
    #[cfg(test)]
    fn canonical_bits(self) -> [u64; 5] {
        [
            self.x.region as u64,
            self.x.local.to_bits(),
            self.y.region as u64,
            self.y.local.to_bits(),
            u64::from(self.pressure.to_bits()),
        ]
    }
    fn from_precise(x: f64, y: f64, pressure: f32) -> Option<Self> {
        if !pressure.is_finite() {
            return None;
        }
        Some(Self {
            x: regional::Address::normalized(0, x)?,
            y: regional::Address::normalized(0, y)?,
            pressure: pressure.clamp(0.0, 1.0),
        })
    }
    fn legacy(self) -> [f32; 3] {
        [self.x.legacy_f32(), self.y.legacy_f32(), self.pressure]
    }
}
/// Each stroke snapshots its response; accepted pressure samples stay unchanged.
#[derive(Clone, Copy, Debug, PartialEq)]
struct PressureCurve {
    minimum: f32,
    gamma: f32,
}
impl Default for PressureCurve {
    fn default() -> Self {
        Self {
            minimum: 0.2,
            gamma: 1.0,
        }
    }
}
impl PressureCurve {
    fn new(minimum: f32, gamma: f32) -> Self {
        let default = Self::default();
        Self {
            minimum: if minimum.is_finite() {
                minimum.clamp(0.0, 0.5)
            } else {
                default.minimum
            },
            gamma: if gamma.is_finite() {
                gamma.clamp(0.25, 4.0)
            } else {
                default.gamma
            },
        }
    }
    fn diameter_fraction(self, pressure: f32) -> f32 {
        self.minimum + (1.0 - self.minimum) * pressure.powf(self.gamma)
    }
}
// Fixed-size canonical blocks avoid copying an entire long stroke during input.
#[derive(Default)]
struct Points {
    blocks: Vec<Vec<Point>>,
    len: usize,
}
impl Points {
    fn push(&mut self, p: Point) {
        if self.len.is_multiple_of(256) {
            self.blocks.push(Vec::with_capacity(256));
        }
        self.blocks.last_mut().unwrap().push(p);
        self.len += 1;
    }
    fn len(&self) -> usize {
        self.len
    }
    fn is_empty(&self) -> bool {
        self.len == 0
    }
}
impl std::ops::Index<usize> for Points {
    type Output = Point;
    fn index(&self, i: usize) -> &Point {
        &self.blocks[i / 256][i % 256]
    }
}
struct Stroke {
    points: Rc<Points>,
    // Slice fragments share immutable accepted samples and a curve interval.
    slice: Option<[f64; 2]>,
    source: usize,
    blend_group: usize,
    width: f32,
    pressure_curve: PressureCurve,
    color: u32,
    // Opacity is stroke style, never part of canonical samples or geometry.
    opacity: f32,
    brush: u32,
    visible: bool,
    layer: usize,
    source_anchor: [regional::Address; 2],
    // Finite displacement from source_anchor; never an absolute flattened address.
    offset: [f64; 2],
    basis: [f64; 2],
}
impl Stroke {
    fn placement(&self, axis: usize) -> Option<regional::Address> {
        self.source_anchor.get(axis)?.offset(*self.offset.get(axis)?)
    }
    fn legacy_offset(&self, axis: usize) -> f64 {
        self.source_anchor[axis].legacy_f64() + self.offset[axis]
    }
    fn source_position(&self, point: Point) -> [f32; 2] {
        [point.x.relative_to(self.source_anchor[0]) as f32,
         point.y.relative_to(self.source_anchor[1]) as f32]
    }
    fn sample_count(&self) -> usize {
        self.slice.map_or(self.points.len(), |[a, b]| {
            (b.ceil() - a.floor()) as usize + 1
        })
    }
    fn parameter(&self, index: usize) -> f64 {
        self.slice.map_or(index as f64, |[a, b]| {
            if index == 0 {
                a
            } else {
                (a.floor() + index as f64).min(b)
            }
        })
    }
    fn render_point(&self, index: usize) -> [f32; 3] {
        if self.slice.is_some() {
            let t = self.parameter(index);
            let i = t.floor() as usize;
            if t.fract() != 0.0 {
                return geometry::evaluate(geometry::source_span(self, i + 1), t.fract());
            }
            return self.source_point(i);
        }
        self.source_point(index)
    }
    fn source_point(&self, index: usize) -> [f32; 3] {
        let p = self.points[index];
        let position = self.source_position(p);
        [
            position[0],
            position[1],
            self.width * 0.5 * self.pressure_curve.diameter_fraction(p.pressure),
        ]
    }
}
struct Engine {
    strokes: Vec<Stroke>,
    active: Option<usize>,
    undo: Vec<Command>,
    redo: Vec<Command>,
    layers: Vec<Layer>,
    layer_order: Vec<usize>,
    active_layer: usize,
    layer_revision: u32,
    layer_render_revision: u32,
    transform_revision: u32,
    moving: Vec<selection::Translation>,
    deleting: Vec<usize>,
    slicing: Option<slice::Gesture>,
}
impl Default for Engine {
    fn default() -> Self {
        Self {
            strokes: Vec::new(),
            active: None,
            undo: Vec::new(),
            redo: Vec::new(),
            layers: vec![Layer::new("Layer 1".into())],
            layer_order: vec![0],
            active_layer: 0,
            layer_revision: 0,
            layer_render_revision: 0,
            transform_revision: 0,
            moving: Vec::new(),
            deleting: Vec::new(),
            slicing: None,
        }
    }
}
impl Engine {
    fn begin(&mut self, width: f32, color: u32) -> usize {
        self.begin_with_pressure(width, color, PressureCurve::default())
    }
    fn begin_with_pressure(
        &mut self,
        width: f32,
        color: u32,
        pressure_curve: PressureCurve,
    ) -> usize {
        self.begin_with_style(width, color, pressure_curve, 1.0)
    }
    fn begin_with_style(
        &mut self,
        width: f32,
        color: u32,
        pressure_curve: PressureCurve,
        opacity: f32,
    ) -> usize {
        self.cancel();
        if !self.can_draw() {
            return usize::MAX;
        }
        let id = self.strokes.len();
        self.strokes.push(Stroke {
            points: Rc::default(),
            slice: None,
            source: id,
            blend_group: id,
            width: width.clamp(0.5, 100.0),
            pressure_curve,
            color,
            opacity: if opacity.is_finite() {
                opacity.clamp(0.0, 1.0)
            } else {
                1.0
            },
            brush: 0,
            visible: true,
            layer: self.active_layer,
            source_anchor: [regional::Address::normalized(0, 0.0).unwrap(); 2],
            offset: [0.0; 2],
            basis: [1.0, 0.0],
        });
        self.active = Some(id);
        id
    }
    fn push(&mut self, x: f32, y: f32, p: f32) {
        self.push_precise(f64::from(x), f64::from(y), p);
    }
    fn push_precise(&mut self, x: f64, y: f64, p: f32) -> bool {
        let Some(point) = Point::from_precise(x, y, p) else {
            return false;
        };
        self.push_point(point)
    }
    fn push_point(&mut self, point: Point) -> bool {
        let Some(id) = self.active else {
            return false;
        };
        if self.strokes[id].points.is_empty() {
            let anchor = [point.x.source_anchor(), point.y.source_anchor()];
            self.strokes[id].source_anchor = anchor;
            // A host may have observed the empty stroke before its first point.
            // Publish the now-frozen source placement before deriving geometry.
            if anchor.iter().any(|axis| axis.region != 0) {
                self.transform_revision = self.transform_revision.wrapping_add(1);
            }
        }
        Rc::get_mut(&mut self.strokes[id].points)
            .expect("active ink is unshared")
            .push(point);
        true
    }
    fn cancel(&mut self) {
        self.cancel_slice();
        self.deleting.clear();
        self.cancel_move();
        if let Some(id) = self.active.take() {
            self.strokes[id].visible = false;
            self.strokes[id].points = Rc::default();
        }
    }
    fn commit(&mut self) {
        if let Some(id) = self.active.take() {
            if self.strokes[id].points.is_empty() {
                self.strokes[id].visible = false;
            } else {
                self.record(Command::Stroke(id));
            }
        }
    }
    fn undo(&mut self) {
        self.cancel();
        if let Some(command) = self.undo.pop() {
            self.apply(&command, false);
            self.redo.push(command);
        }
    }
    fn redo(&mut self) {
        self.cancel();
        if let Some(command) = self.redo.pop() {
            self.apply(&command, true);
            self.undo.push(command);
        }
    }
}
thread_local! {static ENGINE:RefCell<Engine>=RefCell::new(Engine::default());}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn begin(w: f32, c: u32) -> usize {
    ENGINE.with(|e| e.borrow_mut().begin(w, c))
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn begin_with_pressure(w: f32, c: u32, minimum: f32, gamma: f32) -> usize {
    ENGINE.with(|e| {
        e.borrow_mut()
            .begin_with_pressure(w, c, PressureCurve::new(minimum, gamma))
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn begin_with_style(
    w: f32,
    c: u32,
    minimum: f32,
    gamma: f32,
    opacity: f32,
) -> usize {
    ENGINE.with(|e| {
        e.borrow_mut()
            .begin_with_style(w, c, PressureCurve::new(minimum, gamma), opacity)
    })
}
/// Explicit fixed-width style. Pressure samples remain accepted verbatim;
/// the ordinary pressure-curve API keeps its existing validation limits.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn begin_fixed_width(w: f32, c: u32, opacity: f32) -> usize {
    ENGINE.with(|e| {
        e.borrow_mut().begin_with_style(
            w,
            c,
            PressureCurve {
                minimum: 1.0,
                gamma: 1.0,
            },
            opacity,
        )
    })
}
/// Set material only while a new stroke is empty; completed styles are immutable.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn set_active_brush(kind: u32) {
    ENGINE.with(|engine| {
        let mut engine = engine.borrow_mut();
        if let Some(id) = engine.active {
            if engine.strokes[id].points.is_empty() {
                engine.strokes[id].brush = if kind <= 2 { kind } else { 0 };
            }
        }
    });
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn brush(id: usize) -> u32 {
    ENGINE.with(|engine| engine.borrow().strokes[id].brush)
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn stroke_width(id: usize) -> f32 {
    ENGINE.with(|engine| engine.borrow().strokes[id].width)
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn push(x: f32, y: f32, p: f32) {
    ENGINE.with(|e| e.borrow_mut().push(x, y, p));
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn commit() {
    ENGINE.with(|e| e.borrow_mut().commit());
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn cancel() {
    ENGINE.with(|e| e.borrow_mut().cancel());
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn undo() {
    ENGINE.with(|e| e.borrow_mut().undo());
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn redo() {
    ENGINE.with(|e| e.borrow_mut().redo());
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn count() -> usize {
    ENGINE.with(|e| e.borrow().strokes.len())
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn visible(id: usize) -> u32 {
    ENGINE.with(|e| e.borrow().stroke_visible(id) as u32)
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn length(id: usize) -> usize {
    ENGINE.with(|e| e.borrow().strokes.get(id).map_or(0, |s| s.sample_count()))
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn color(id: usize) -> u32 {
    ENGINE.with(|e| e.borrow().strokes[id].color)
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn opacity(id: usize) -> f32 {
    ENGINE.with(|e| e.borrow().strokes[id].opacity)
}
// Shared geometry policy applies the stroke's saved curve to canonical pressure.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn point(id: usize, i: usize, field: u32) -> f32 {
    ENGINE.with(|e| {
        let e = e.borrow();
        let s = &e.strokes[id];
        s.render_point(i)[field.min(2) as usize]
    })
}
// Scratch is borrowed only for a single call; hosts must copy before the next
// render call (and create their Wasm memory view after rendering may grow memory).
thread_local! {static GEOMETRY:RefCell<geometry::Scratch>=RefCell::new(geometry::Scratch::default());}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn render_chunk(id: usize, chunk: usize, tolerance: f32) -> usize {
    ENGINE.with(|engine| {
        GEOMETRY.with(|geometry| {
            let engine = engine.borrow();
            let mut geometry = geometry.borrow_mut();
            if let Some(stroke) = engine.strokes.get(id) {
                geometry.render(stroke, chunk, tolerance)
            } else {
                geometry.output.clear();
                0
            }
        })
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn render_chunk_ptr() -> *const f32 {
    GEOMETRY.with(|geometry| geometry.borrow().output.as_ptr())
}
// Fields: minX, minY, maxX, maxY, including brush radius and control hull.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn raw_chunk_bounds(id: usize, chunk: usize, field: u32) -> f32 {
    ENGINE.with(|engine| {
        engine
            .borrow()
            .strokes
            .get(id)
            .and_then(|stroke| geometry::chunk_bounds(stroke, chunk))
            .and_then(|bounds| bounds.get(field as usize).copied())
            .unwrap_or(f32::NAN)
    })
}

// A bounded, copied job for an independent Wasm worker. Two predecessor samples
// and one successor preserve the exact tangents/anchors at chunk boundaries.
const SNAPSHOT_HEADER: usize = 6;
const SNAPSHOT_CAPACITY: usize = SNAPSHOT_HEADER + geometry::CHUNK_POINTS * 12;
thread_local! {static GEOMETRY_INPUT:RefCell<[f32;SNAPSHOT_CAPACITY]>=const { RefCell::new([0.0;SNAPSHOT_CAPACITY]) };}
/// Float counts for the copied derived-geometry transport. These are not
/// document limits. Hosts must copy results before the next geometry call.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn geometry_input_capacity() -> usize {
    SNAPSHOT_CAPACITY
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn geometry_output_capacity() -> usize {
    geometry::MAX_CHUNK_SEGMENTS * 6
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn geometry_input_ptr() -> *mut f32 {
    GEOMETRY_INPUT.with(|input| input.borrow_mut().as_mut_ptr())
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn geometry_snapshot(id: usize, chunk: usize) -> usize {
    ENGINE.with(|engine| {
        let engine = engine.borrow();
        let Some(stroke) = engine.strokes.get(id) else {
            return 0;
        };
        let Some(range) = geometry::chunk_range(stroke, chunk) else {
            return 0;
        };
        if stroke.slice.is_some() {
            return GEOMETRY_INPUT.with(|input| {
                let mut input = input.borrow_mut();
                input[..6].copy_from_slice(&[
                    -1.0,
                    range.len() as f32,
                    (range.start == 0) as u8 as f32,
                    0.0,
                    0.0,
                    0.0,
                ]);
                for (i, index) in range.enumerate() {
                    let c = geometry::span(stroke, index);
                    for j in 0..4 {
                        input[6 + i * 12 + j * 3..9 + i * 12 + j * 3].copy_from_slice(&c[j]);
                    }
                }
                6 + input[1] as usize * 12
            });
        }
        let first = range.start.saturating_sub(2);
        let end = (range.end + 1).min(stroke.points.len());
        GEOMETRY_INPUT.with(|input| {
            let mut input = input.borrow_mut();
            input[..SNAPSHOT_HEADER].copy_from_slice(&[
                (end - first) as f32,
                (range.start - first) as f32,
                (range.end - first) as f32,
                stroke.width,
                stroke.pressure_curve.minimum,
                stroke.pressure_curve.gamma,
            ]);
            for (index, source) in (first..end).enumerate() {
                let p = stroke.points[source];
                let at = SNAPSHOT_HEADER + index * 3;
                let position = stroke.source_position(p);
                input[at..at + 3].copy_from_slice(&[position[0], position[1], p.pressure]);
            }
        });
        SNAPSHOT_HEADER + (end - first) * 3
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn render_snapshot(length: usize, tolerance: f32) -> usize {
    GEOMETRY_INPUT.with(|input| {
        let input = input.borrow();
        if !(SNAPSHOT_HEADER..=SNAPSHOT_CAPACITY).contains(&length) {
            return 0;
        }
        if input[0] == -1.0 {
            let count = input[1] as usize;
            if count == 0
                || count > geometry::CHUNK_POINTS
                || length != 6 + count * 12
                || !input[..length].iter().all(|v| v.is_finite())
            {
                return 0;
            }
            let curves: Vec<geometry::Cubic> = input[6..length]
                .as_chunks::<12>()
                .0
                .iter()
                .map(|p| std::array::from_fn(|j| [p[j * 3], p[j * 3 + 1], p[j * 3 + 2]]))
                .collect();
            return GEOMETRY.with(|g| {
                g.borrow_mut()
                    .render_curves(&curves, input[2] == 1.0, tolerance)
            });
        }
        let count = input[0] as usize;
        let start = input[1] as usize;
        let end = input[2] as usize;
        if count > geometry::CHUNK_POINTS + 3
            || length != SNAPSHOT_HEADER + count * 3
            || start >= end
            || end > count
            || end - start > geometry::CHUNK_POINTS
            || !input[..length].iter().all(|v| v.is_finite())
        {
            return 0;
        }
        let mut points = Points::default();
        for p in input[SNAPSHOT_HEADER..length].as_chunks::<3>().0 {
            // This worker snapshot is derived geometry, not owning raw data.
            points.push(Point::from_precise(f64::from(p[0]), f64::from(p[1]), p[2]).unwrap());
        }
        let stroke = Stroke {
            points: Rc::new(points),
            slice: None,
            source: 0,
            blend_group: 0,
            width: input[3],
            // Only the exact style emitted by begin_fixed_width bypasses
            // pressure response. All other snapshot parameters retain their
            // original finite/clamped pressure-curve validation.
            pressure_curve: if input[4] == 1.0 && input[5] == 1.0 {
                PressureCurve {
                    minimum: 1.0,
                    gamma: 1.0,
                }
            } else {
                PressureCurve::new(input[4], input[5])
            },
            color: 0,
            opacity: 1.0,
            brush: 0,
            visible: true,
            layer: 0,
            source_anchor: [regional::Address::normalized(0, 0.0).unwrap(); 2],
            offset: [0.0; 2],
            basis: [1.0, 0.0],
        };
        GEOMETRY.with(|scratch| {
            scratch
                .borrow_mut()
                .render_range(&stroke, start..end, tolerance)
        })
    })
}

// Bounds use their own fixed scratch array, independent of render geometry.
// Copy all four fields immediately; the next bounds-pointer call overwrites it.
thread_local! {static CHUNK_BOUNDS:RefCell<[f32;4]>=const { RefCell::new([f32::NAN;4]) };}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn raw_chunk_bounds_ptr(id: usize, chunk: usize) -> *const f32 {
    let bounds = ENGINE.with(|engine| {
        engine
            .borrow()
            .strokes
            .get(id)
            .and_then(|stroke| geometry::chunk_bounds(stroke, chunk))
            .unwrap_or([f32::NAN; 4])
    });
    CHUNK_BOUNDS.with(|scratch| {
        let mut scratch = scratch.borrow_mut();
        *scratch = bounds;
        scratch.as_ptr()
    })
}
// Legacy f32 inspection/projection. Use raw_region/raw_local for canonical coordinates.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn raw_point(id: usize, index: usize, field: u32) -> f32 {
    ENGINE.with(|engine| {
        let engine = engine.borrow();
        let Some(stroke) = engine.strokes.get(id) else {
            return f32::NAN;
        };
        if index >= stroke.points.len() || field > 2 {
            return f32::NAN;
        }
        let point = stroke.points[index];
        point.legacy()[field as usize]
    })
}
/// Canonical coordinate inspection: axis 0 = x, 1 = y. Validate raw_length first.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn raw_region(id: usize, index: usize, axis: u32) -> i64 {
    ENGINE.with(|engine| {
        let engine = engine.borrow();
        let Some(stroke) = engine.strokes.get(id) else {
            return 0;
        };
        if index >= stroke.points.len() || axis > 1 {
            return 0;
        }
        let point = stroke.points[index];
        if axis == 0 {
            point.x.region
        } else {
            point.y.region
        }
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn raw_local(id: usize, index: usize, axis: u32) -> f64 {
    ENGINE.with(|engine| {
        let engine = engine.borrow();
        let Some(stroke) = engine.strokes.get(id) else {
            return f64::NAN;
        };
        if index >= stroke.points.len() || axis > 1 {
            return f64::NAN;
        }
        let point = stroke.points[index];
        if axis == 0 {
            point.x.local
        } else {
            point.y.local
        }
    })
}
/// Transitional f64 input mapping. Regional camera adoption will replace flat input.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn push_precise(x: f64, y: f64, pressure: f32) -> u32 {
    ENGINE.with(|engine| engine.borrow_mut().push_precise(x, y, pressure) as u32)
}
/// Explicit canonical input. Carry/borrow is normalized in the owning engine.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn push_regional(rx: i64, x: f64, ry: i64, y: f64, pressure: f32) -> u32 {
    let (Some(x), Some(y)) = (
        regional::Address::normalized(rx, x),
        regional::Address::normalized(ry, y),
    ) else {
        return 0;
    };
    if !pressure.is_finite() {
        return 0;
    }
    ENGINE.with(|engine| {
        engine.borrow_mut().push_point(Point {
            x,
            y,
            pressure: pressure.clamp(0.0, 1.0),
        }) as u32
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn canonical_sample_bytes() -> usize {
    std::mem::size_of::<Point>()
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn pressure_curve_has_bounded_monotonic_response_and_exact_endpoints() {
        for minimum in [0.0, 0.05, 0.2, 0.5] {
            for gamma in [0.25, 1.0, 1.8, 2.0, 4.0] {
                let curve = PressureCurve::new(minimum, gamma);
                assert_eq!(curve.diameter_fraction(0.0), minimum);
                assert_eq!(curve.diameter_fraction(1.0), 1.0);
                let mut previous = minimum;
                for index in 1..=100 {
                    let fraction = curve.diameter_fraction(index as f32 / 100.0);
                    assert!((previous..=1.0).contains(&fraction));
                    previous = fraction;
                }
            }
        }
        let old_midpoint = PressureCurve::default().diameter_fraction(0.5);
        let steep_midpoint = PressureCurve::new(0.05, 2.0).diameter_fraction(0.5);
        assert!((old_midpoint - 0.6).abs() < 0.000001);
        assert!((steep_midpoint - 0.2875).abs() < 0.000001);
    }
    #[test]
    fn pressure_curve_parameters_are_finite_and_clamped() {
        assert_eq!(
            PressureCurve::new(-1.0, -1.0),
            PressureCurve {
                minimum: 0.0,
                gamma: 0.25
            }
        );
        assert_eq!(
            PressureCurve::new(2.0, 10.0),
            PressureCurve {
                minimum: 0.5,
                gamma: 4.0
            }
        );
        for invalid in [f32::NAN, f32::NEG_INFINITY, f32::INFINITY] {
            assert_eq!(
                PressureCurve::new(invalid, invalid),
                PressureCurve::default()
            );
            assert_eq!(PressureCurve::new(0.05, invalid).minimum, 0.05);
            assert_eq!(PressureCurve::new(invalid, 2.0).gamma, 2.0);
        }
    }
    #[test]
    fn response_is_saved_per_stroke_and_raw_pressure_survives_geometry_and_history() {
        ENGINE.with(|engine| *engine.borrow_mut() = Engine::default());
        let id = begin_with_pressure(10.0, 0, 0.05, 2.0);
        for index in 0..4 {
            push(index as f32 * 5.0, 2.0, 0.5);
        }
        commit();
        let radius = point(id, 0, 2);
        assert!((radius - 1.4375).abs() < 0.000001);
        for tolerance in [0.01, 0.25, 10.0] {
            assert!(render_chunk(id, 0, tolerance) > 0);
            GEOMETRY.with(|scratch| {
                for vertex in scratch.borrow().output.as_chunks::<3>().0 {
                    assert!((vertex[2] - radius).abs() < 0.000001);
                }
            });
        }
        assert!((raw_chunk_bounds(id, 0, 1) - (2.0 - radius)).abs() < 0.000001);
        assert!((raw_chunk_bounds(id, 0, 3) - (2.0 + radius)).abs() < 0.000001);
        let other = begin_with_pressure(10.0, 0, 0.5, 0.25);
        push(0.0, 0.0, 0.5);
        commit();
        assert!(point(other, 0, 2) > radius);
        assert_eq!(point(id, 0, 2), radius);
        undo();
        undo();
        redo();
        assert_eq!(point(id, 0, 2), radius);
        for index in 0..4 {
            assert_eq!(raw_point(id, index, 2).to_bits(), 0.5_f32.to_bits());
        }
    }
    #[test]
    fn original_begin_and_native_begin_keep_the_original_linear_response() {
        ENGINE.with(|engine| *engine.borrow_mut() = Engine::default());
        let old = begin(10.0, 0);
        push(0.0, 0.0, 0.5);
        commit();
        assert_eq!(point(old, 0, 2), 3.0);
        assert_eq!(opacity(old), 1.0);
        let pressure = begin_with_pressure(10.0, 0, 0.05, 2.0);
        push(0.0, 0.0, 0.5);
        commit();
        assert_eq!(opacity(pressure), 1.0);
        #[cfg(not(target_arch = "wasm32"))]
        {
            let native = native::vc_begin(10.0, 0);
            native::vc_push(0.0, 0.0, 0.5);
            native::vc_commit();
            assert_eq!(point(native, 0, 2), 3.0);
            assert_eq!(opacity(native), 1.0);
        }
    }
    #[test]
    fn opacity_is_finite_and_clamped() {
        ENGINE.with(|engine| *engine.borrow_mut() = Engine::default());
        for (input, expected) in [
            (-0.5, 0.0),
            (0.0, 0.0),
            (0.375, 0.375),
            (1.0, 1.0),
            (2.0, 1.0),
            (f32::NAN, 1.0),
            (f32::NEG_INFINITY, 1.0),
            (f32::INFINITY, 1.0),
        ] {
            let id = begin_with_style(10.0, 0, 0.05, 2.0, input);
            assert_eq!(opacity(id), expected);
            cancel();
        }
    }
    #[test]
    fn opacity_never_changes_raw_samples_bounds_or_geometry_at_any_detail() {
        ENGINE.with(|engine| *engine.borrow_mut() = Engine::default());
        let samples: Vec<[f32; 3]> = (0..270)
            .map(|i| {
                let x = i as f32 * 0.75;
                [x, (x * 0.05).sin() * 12.0, (i % 17) as f32 / 16.0]
            })
            .collect();
        let ids = [1.0, 0.5, 0.0].map(|alpha| {
            let id = begin_with_style(10.0, 0x123456, 0.05, 2.0, alpha);
            for &[x, y, pressure] in &samples {
                push(x, y, pressure);
            }
            commit();
            id
        });
        for &id in &ids {
            assert_eq!(length(id), samples.len());
            for (index, sample) in samples.iter().enumerate() {
                for (field, expected) in sample.iter().enumerate() {
                    assert_eq!(
                        raw_point(id, index, field as u32).to_bits(),
                        expected.to_bits()
                    );
                }
            }
            for chunk in 0..3 {
                for field in 0..4 {
                    assert_eq!(
                        raw_chunk_bounds(id, chunk, field),
                        raw_chunk_bounds(ids[0], chunk, field)
                    );
                }
                for tolerance in [0.01, 0.25, 10.0] {
                    let count = render_chunk(ids[0], chunk, tolerance);
                    let expected = GEOMETRY.with(|scratch| scratch.borrow().output.clone());
                    assert!(count > 0);
                    assert_eq!(render_chunk(id, chunk, tolerance), count);
                    GEOMETRY.with(|scratch| assert_eq!(scratch.borrow().output, expected));
                }
            }
        }
    }
    #[test]
    fn opacity_style_survives_history_and_new_strokes_without_changing_accepted_data() {
        ENGINE.with(|engine| *engine.borrow_mut() = Engine::default());
        let first = begin_with_style(10.0, 0x123456, 0.05, 2.0, 0.375);
        push(4.0, 5.0, 0.25);
        commit();
        let second = begin_with_style(10.0, 0x654321, 0.2, 1.0, 0.75);
        push(6.0, 7.0, 0.5);
        commit();
        undo();
        undo();
        assert_eq!(visible(first), 0);
        redo();
        redo();
        assert_eq!(visible(first), 1);
        assert_eq!(visible(second), 1);
        assert_eq!(opacity(first), 0.375);
        assert_eq!(opacity(second), 0.75);
        let canceled = begin_with_style(10.0, 0, 0.2, 1.0, 0.125);
        push(0.0, 0.0, 1.0);
        cancel();
        assert_eq!(visible(canceled), 0);
        assert_eq!(length(canceled), 0);
        undo();
        let branch = begin_with_style(10.0, 0, 0.2, 1.0, 0.25);
        push(1.0, 2.0, 0.75);
        commit();
        redo();
        assert_eq!(length(second), 0);
        assert_eq!(visible(second), 0);
        assert_eq!(opacity(first), 0.375);
        assert_eq!(opacity(branch), 0.25);
        for (field, expected) in [4.0_f32, 5.0, 0.25].iter().enumerate() {
            assert_eq!(
                raw_point(first, 0, field as u32).to_bits(),
                expected.to_bits()
            );
        }
    }
    #[test]
    fn history_and_cancel() {
        let mut e = Engine::default();
        e.begin(4., 0);
        e.push(1., 2., 0.5);
        e.commit();
        e.undo();
        assert!(!e.strokes[0].visible);
        e.redo();
        assert!(e.strokes[0].visible);
        e.begin(2., 0);
        e.push(0., 0., 1.);
        e.cancel();
        assert_eq!(e.undo.len(), 1);
        assert!(e.strokes[1].points.is_empty());
    }
    #[test]
    fn bounds_pointer_matches_fields_and_is_separate_from_render_scratch() {
        ENGINE.with(|engine| *engine.borrow_mut() = Engine::default());
        let id = begin(10.0, 0);
        for index in 0..140 {
            let x = index as f32;
            push(x, (x * 0.08).sin() * 15.0, 0.2 + x / 200.0);
        }
        commit();
        for chunk in 0..2 {
            let pointer = raw_chunk_bounds_ptr(id, chunk);
            // SAFETY: this thread owns the fixed four-field scratch array and
            // neither scalar bounds reads nor rendering overwrite that array.
            let actual = unsafe { std::slice::from_raw_parts(pointer, 4) };
            for (field, value) in actual.iter().enumerate() {
                assert_eq!(*value, raw_chunk_bounds(id, chunk, field as u32));
            }
            let before = actual.to_vec();
            render_chunk(id, chunk, 0.25);
            assert_eq!(actual, before);
        }
        for (stroke, chunk) in [(usize::MAX, 0), (id, usize::MAX)] {
            let pointer = raw_chunk_bounds_ptr(stroke, chunk);
            // SAFETY: the returned fixed-size scratch contains four NaNs.
            let actual = unsafe { std::slice::from_raw_parts(pointer, 4) };
            assert!(actual.iter().all(|field| field.is_nan()));
        }
    }
    #[test]
    fn branch_drops_redo_points() {
        let mut e = Engine::default();
        e.begin(1., 0);
        e.push(0., 0., 1.);
        e.commit();
        e.undo();
        e.begin(1., 0);
        e.push(1., 1., 1.);
        e.commit();
        assert!(e.redo.is_empty());
        assert!(e.strokes[0].points.is_empty());
    }
}

#[cfg(test)]
mod worker_snapshot_tests {
    use super::*;
    #[test]
    fn fixed_width_preserves_raw_input_geometry_worker_output_and_history() {
        ENGINE.with(|engine| *engine.borrow_mut() = Engine::default());
        let pressures = [0.0, 0.05, 0.2, 0.5, 0.8, 1.0];
        let accepted: Vec<[f32; 3]> = (0..390)
            .map(|i| {
                let x = i as f32 * 0.75;
                [x, (x * 0.05).sin() * 10.0, pressures[i % pressures.len()]]
            })
            .collect();
        let id = begin_fixed_width(10.0, 0x123456, 0.375);
        for p in &accepted {
            push(p[0], p[1], p[2]);
        }
        commit();
        assert_eq!(length(id), accepted.len());
        assert_eq!(opacity(id), 0.375);
        let check_raw = || {
            for (index, p) in accepted.iter().enumerate() {
                for (field, expected) in p.iter().enumerate() {
                    assert_eq!(
                        raw_point(id, index, field as u32).to_bits(),
                        expected.to_bits()
                    );
                }
                assert_eq!(point(id, index, 2), 5.0);
            }
        };
        check_raw();
        for chunk in 0..4 {
            for tolerance in [0.015625, 0.25, 4.0] {
                let n = render_chunk(id, chunk, tolerance);
                assert!(n > 0);
                let direct = GEOMETRY.with(|s| s.borrow().output.clone());
                assert!(direct.as_chunks::<3>().0.iter().all(|p| p[2] == 5.0));
                let snapshot_length = geometry_snapshot(id, chunk);
                assert!(snapshot_length <= SNAPSHOT_CAPACITY);
                assert_eq!(render_snapshot(snapshot_length, tolerance), n);
                let copied = GEOMETRY.with(|s| s.borrow().output.clone());
                assert_eq!(
                    direct.iter().map(|v| v.to_bits()).collect::<Vec<_>>(),
                    copied.iter().map(|v| v.to_bits()).collect::<Vec<_>>()
                );
            }
        }
        check_raw();
        // The existing entry point still clamps minimum=1 to its former limit.
        let ordinary = begin_with_style(10.0, 0, 1.0, 1.0, 1.0);
        push(0.0, 0.0, 0.0);
        commit();
        assert_eq!(point(ordinary, 0, 2), 2.5);
        assert_eq!(point(id, 0, 2), 5.0);
        undo();
        undo();
        assert_eq!(visible(id), 0);
        redo();
        assert_eq!(visible(id), 1);
        assert_eq!(opacity(id), 0.375);
        redo();
        check_raw();
    }
    #[test]
    fn fixed_width_worker_style_requires_its_exact_reserved_curve() {
        ENGINE.with(|engine| *engine.borrow_mut() = Engine::default());
        let id = begin_fixed_width(10.0, 0, 1.0);
        let input = [[0.0, 0.0, 0.0], [10.0, 4.0, 0.25], [20.0, 0.0, 1.0]];
        for p in input {
            push(p[0], p[1], p[2]);
        }
        commit();
        let snapshot_length = geometry_snapshot(id, 0);
        GEOMETRY_INPUT.with(|snapshot| snapshot.borrow_mut()[5] = 2.0);
        let worker_count = render_snapshot(snapshot_length, 0.25);
        let worker = GEOMETRY.with(|s| s.borrow().output.clone());
        let ordinary = begin_with_style(10.0, 0, 1.0, 2.0, 1.0);
        for p in input {
            push(p[0], p[1], p[2]);
        }
        commit();
        assert_eq!(worker_count, render_chunk(ordinary, 0, 0.25));
        let direct = GEOMETRY.with(|s| s.borrow().output.clone());
        assert_eq!(
            worker.iter().map(|v| v.to_bits()).collect::<Vec<_>>(),
            direct.iter().map(|v| v.to_bits()).collect::<Vec<_>>()
        );
    }
    #[test]
    fn worker_snapshots_match_direct_geometry_bit_for_bit() {
        let id = begin_with_style(7.0, 0x123456, 0.1, 2.4, 0.37);
        for i in 0..390 {
            let x = i as f32;
            push(x, (x * 0.08).sin() * 15.0, ((i * 31) % 97) as f32 / 96.0);
        }
        commit();
        for chunk in 0..4 {
            for tolerance in [0.015625, 0.25, 4.0] {
                let n = render_chunk(id, chunk, tolerance);
                let direct = GEOMETRY.with(|s| s.borrow().output.clone());
                let length = geometry_snapshot(id, chunk);
                if length == 0 {
                    assert_eq!(n, 0);
                    continue;
                }
                assert!(length <= SNAPSHOT_CAPACITY);
                assert_eq!(render_snapshot(length, tolerance), n);
                let copied = GEOMETRY.with(|s| s.borrow().output.clone());
                assert_eq!(
                    direct.iter().map(|v| v.to_bits()).collect::<Vec<_>>(),
                    copied.iter().map(|v| v.to_bits()).collect::<Vec<_>>()
                );
            }
        }
        assert_eq!(length(id), 390);
    }
    #[test]
    fn malformed_snapshot_rejected_without_indexing_outside_scratch() {
        GEOMETRY_INPUT.with(|s| s.borrow_mut()[0] = f32::MAX);
        assert_eq!(render_snapshot(usize::MAX, 1.0), 0);
        GEOMETRY_INPUT
            .with(|s| s.borrow_mut()[..6].copy_from_slice(&[2.0, 0.0, 3.0, 2.0, 0.2, 1.0]));
        assert_eq!(render_snapshot(12, 1.0), 0);
    }
}

#[cfg(test)]
mod pencil_tests {
    use super::*;
    fn reset() {
        ENGINE.with(|e| *e.borrow_mut() = Engine::default());
    }
    fn raw(id: usize) -> Vec<f32> {
        (0..slice::raw_length(id))
            .flat_map(|i| (0..3).map(move |k| raw_point(id, i, k)))
            .collect()
    }
    fn geometry(id: usize) -> Vec<f32> {
        let count = render_chunk(id, 0, 0.1);
        unsafe { std::slice::from_raw_parts(render_chunk_ptr(), count * 6).to_vec() }
    }
    #[test]
    fn pencil_material_does_not_change_raw_pressure_or_geometry_and_freezes_at_first_sample() {
        reset();
        let mut original = None;
        for kind in 0..=2 {
            let id = begin_with_style(12.0, 0x123456, 0.05, 1.8, 0.6);
            set_active_brush(kind);
            for (i, pressure) in [0.1, 0.7, 1.0, 0.3].into_iter().enumerate() {
                push(i as f32 * 20.0, (i % 2) as f32 * 10.0, pressure);
            }
            set_active_brush(2 - kind);
            assert_eq!(brush(id), kind);
            commit();
            let result = (raw(id), geometry(id));
            if let Some(ref expected) = original {
                assert_eq!(&result, expected);
            } else {
                original = Some(result);
            }
            assert_eq!(opacity(id), 0.6);
            undo();
            redo();
            assert_eq!(brush(id), kind);
        }
        let id = begin(6.0, 0);
        set_active_brush(99);
        assert_eq!(brush(id), 0);
        cancel();
        assert_eq!(brush(begin(6.0, 0)), 0);
    }
    #[test]
    fn sliced_pencil_fragments_retain_material_source_and_history() {
        reset();
        let id = begin_with_style(12.0, 0x345678, 0.05, 1.8, 0.7);
        set_active_brush(2);
        push(0.0, 0.0, 0.2);
        push(100.0, 0.0, 0.9);
        commit();
        let original = raw(id);
        slice::slice_begin(0.0, 0);
        slice::slice_push(50.0, -30.0);
        slice::slice_push(50.0, 30.0);
        slice::slice_commit();
        assert_eq!(count(), 3);
        assert_eq!(visible(id), 0);
        for fragment in 1..3 {
            assert_eq!(brush(fragment), 2);
            assert_eq!(opacity(fragment), 0.7);
            assert_eq!(stroke_width(fragment), 12.0);
            assert_eq!(raw(fragment), original);
        }
        undo();
        assert_eq!(visible(id), 1);
        redo();
        assert_eq!(brush(2), 2);
        assert_eq!(raw(id), original);
    }
}
