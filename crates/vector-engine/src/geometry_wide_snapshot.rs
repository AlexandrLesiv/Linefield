//! Bounded disposable wide-coordinate worker snapshots; no owning document mutation.
use super::geometry_wide_transport::{INPUT, SCRATCH};
use super::{
    geometry_wide, regional, Point, Points, PressureCurve, Stroke, ENGINE, SNAPSHOT_CAPACITY,
    SNAPSHOT_HEADER,
};
use std::rc::Rc;
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn geometry_snapshot_f64(id: usize, chunk: usize) -> usize {
    ENGINE.with(|engine| {
        let engine = engine.borrow();
        let Some(stroke) = engine.strokes.get(id) else {
            return 0;
        };
        let Some(range) = geometry_wide::chunk_range(stroke, chunk) else {
            return 0;
        };
        if stroke.slice.is_some() {
            return INPUT.with(|input| {
                let mut input = input.borrow_mut();
                input[..6].copy_from_slice(&[
                    -1.0,
                    range.len() as f64,
                    (range.start == 0) as u8 as f64,
                    0.0,
                    0.0,
                    0.0,
                ]);
                for (i, index) in range.enumerate() {
                    let c = geometry_wide::span(stroke, index);
                    for j in 0..4 {
                        input[6 + i * 12 + j * 3..9 + i * 12 + j * 3].copy_from_slice(&c[j]);
                    }
                }
                6 + input[1] as usize * 12
            });
        }
        let first = range.start.saturating_sub(2);
        let end = (range.end + 1).min(stroke.points.len());
        INPUT.with(|input| {
            let mut input = input.borrow_mut();
            input[..SNAPSHOT_HEADER].copy_from_slice(&[
                (end - first) as f64,
                (range.start - first) as f64,
                (range.end - first) as f64,
                f64::from(stroke.width),
                f64::from(stroke.pressure_curve.minimum),
                f64::from(stroke.pressure_curve.gamma),
            ]);
            for (index, source) in (first..end).enumerate() {
                let p = stroke.points[source];
                let at = SNAPSHOT_HEADER + index * 3;
                let position = [
                    p.x.relative_to(stroke.source_anchor[0]),
                    p.y.relative_to(stroke.source_anchor[1]),
                ];
                input[at..at + 3].copy_from_slice(&[
                    position[0],
                    position[1],
                    f64::from(p.pressure),
                ]);
            }
        });
        SNAPSHOT_HEADER + (end - first) * 3
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn render_snapshot_f64(length: usize, tolerance: f64) -> usize {
    INPUT.with(|input| {
        let input = input.borrow();
        if !(SNAPSHOT_HEADER..=SNAPSHOT_CAPACITY).contains(&length) {
            return 0;
        }
        if input[0] == -1.0 {
            let count = input[1] as usize;
            if count == 0
                || count > geometry_wide::CHUNK_POINTS
                || length != 6 + count * 12
                || !input[..length].iter().all(|v| v.is_finite())
            {
                return 0;
            }
            let curves: Vec<geometry_wide::Cubic> = input[6..length]
                .as_chunks::<12>()
                .0
                .iter()
                .map(|p| std::array::from_fn(|j| [p[j * 3], p[j * 3 + 1], p[j * 3 + 2]]))
                .collect();
            return SCRATCH.with(|g| {
                g.borrow_mut()
                    .render_curves(&curves, input[2] == 1.0, tolerance)
            });
        }
        let count = input[0] as usize;
        let start = input[1] as usize;
        let end = input[2] as usize;
        if count > geometry_wide::CHUNK_POINTS + 3
            || length != SNAPSHOT_HEADER + count * 3
            || input[..3].iter().any(|v| v.fract() != 0.0)
            || input[3..6].iter().any(|v| !(*v as f32).is_finite())
            || start >= end
            || end > count
            || end - start > geometry_wide::CHUNK_POINTS
            || !input[..length].iter().all(|v| v.is_finite())
        {
            return 0;
        }
        let mut points = Points::default();
        for p in input[SNAPSHOT_HEADER..length].as_chunks::<3>().0 {
            // This worker snapshot is derived geometry, not owning raw data.
            let Some(point) = Point::from_precise(p[0], p[1], p[2] as f32) else {
                return 0;
            };
            points.push(point);
        }
        let stroke = Stroke {
            points: Rc::new(points),
            slice: None,
            source: 0,
            blend_group: 0,
            width: input[3] as f32,
            // Only the exact style emitted by begin_fixed_width bypasses
            // pressure response. All other snapshot parameters retain their
            // original finite/clamped pressure-curve validation.
            pressure_curve: if input[4] == 1.0 && input[5] == 1.0 {
                PressureCurve {
                    minimum: 1.0,
                    gamma: 1.0,
                }
            } else {
                PressureCurve::new(input[4] as f32, input[5] as f32)
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
        SCRATCH.with(|scratch| {
            scratch
                .borrow_mut()
                .render_range(&stroke, start..end, tolerance)
        })
    })
}
