//! Approved geometry policy, instantiated with the original f32 arithmetic.
type Real = f32;
fn source_point(stroke: &crate::Stroke, index: usize) -> [Real; 3] { stroke.source_point(index) }
include!("geometry_math.rs");

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{Point, Points};

    fn stroke(samples: &[[f32; 3]]) -> Stroke {
        let mut points = Points::default();
        for &[x, y, pressure] in samples {
            points.push(Point::from_precise(f64::from(x), f64::from(y), pressure).unwrap());
        }
        Stroke {
            layer: 0,
            source_anchor: [crate::regional::Address::normalized(0, 0.0).unwrap(); 2],
            offset: [0.0; 2],
            basis: [1.0, 0.0],
            points: std::rc::Rc::new(points),
            slice: None,
            source: 0,
            blend_group: 0,
            width: 10.0,
            pressure_curve: crate::PressureCurve::default(),
            color: 0,
            opacity: 1.0,
            brush: 0,
            visible: true,
        }
    }
    fn wave(count: usize) -> Stroke {
        stroke(
            &(0..count)
                .map(|i| [i as f32 * 0.6, (i as f32 * 0.055).sin() * 12.0, 0.5])
                .collect::<Vec<_>>(),
        )
    }
    fn endpoint_present(output: &[f32], point: Position) -> bool {
        output
            .as_chunks::<6>()
            .0
            .iter()
            .any(|segment| segment[3..] == point)
    }
    #[test]
    fn chunks_share_exact_endpoints_and_canonical_samples_survive() {
        let stroke = wave(300);
        let before: Vec<_> = (0..stroke.points.len())
            .map(|i| {
                let p = stroke.points[i];
                p.canonical_bits()
            })
            .collect();
        let mut scratch = Scratch::default();
        for tolerance in [0.01, 0.25, 4.0] {
            scratch.render(&stroke, 0, tolerance);
            let last = scratch.output[scratch.output.len() - 3..].to_vec();
            assert_eq!(last, stroke.source_point(127));
            scratch.render(&stroke, 1, tolerance);
            assert_eq!(&scratch.output[..3], last);
            assert_eq!(
                &scratch.output[scratch.output.len() - 3..],
                stroke.source_point(255)
            );
            scratch.render(&stroke, 2, tolerance);
            assert_eq!(&scratch.output[..3], stroke.source_point(255));
        }
        for (i, bits) in before.iter().enumerate() {
            let p = stroke.points[i];
            assert_eq!(p.canonical_bits(), *bits);
        }
    }
    #[test]
    fn corners_stationary_dabs_and_pressure_extrema_survive_coarse_detail() {
        let stroke = stroke(&[
            [0.0, 0.0, 0.2],
            [10.0, 0.0, 0.2],
            [10.0, 10.0, 0.2],
            [10.0, 10.0, 0.9],
            [10.0, 10.0, 0.1],
            [20.0, 10.0, 0.8],
            [30.0, 10.0, 0.2],
        ]);
        let mut scratch = Scratch::default();
        scratch.render(&stroke, 0, 100.0);
        for index in 0..stroke.points.len() {
            assert!(
                endpoint_present(&scratch.output, stroke.source_point(index)),
                "missing anchor {index}"
            );
        }
        let stationary_spans = scratch
            .output
            .as_chunks::<6>()
            .0
            .iter()
            .filter(|s| s[0] == s[3] && s[1] == s[4])
            .count();
        assert_eq!(stationary_spans, 3); // initial dab and two pressure changes
    }
    #[test]
    fn curved_spans_are_smooth_and_radius_cannot_overshoot() {
        let stroke = stroke(&[
            [0.0, 0.0, 0.0],
            [10.0, 2.0, 0.2],
            [20.0, 8.0, 0.8],
            [30.0, 18.0, 1.0],
        ]);
        let mut vertices = vec![Vertex {
            point: stroke.source_point(1),
            keep: true,
        }];
        let curve = span(&stroke, 2);
        flatten(curve, 0.001, 0, &mut vertices);
        assert!(vertices.len() > 2);
        assert!(vertices.iter().any(|v| {
            let t = (v.point[0] - 10.0) / 10.0;
            (v.point[1] - (2.0 + 6.0 * t)).abs() > 0.2
        }));
        let low = stroke.source_point(1)[2];
        let high = stroke.source_point(2)[2];
        for pair in vertices.windows(2) {
            assert!(pair[1].point[2] >= pair[0].point[2]);
            assert!((low..=high).contains(&pair[1].point[2]));
        }
        // The derivative at a shared, smooth sample agrees from either side.
        let next = span(&stroke, 3);
        for field in 0..2 {
            assert!(
                ((curve[3][field] - curve[2][field]) - (next[1][field] - next[0][field])).abs()
                    < 0.00001
            );
        }
    }
    #[test]
    fn coarse_tolerance_reduces_geometry_without_losing_endpoints() {
        let stroke = wave(128);
        let mut scratch = Scratch::default();
        let fine = scratch.render(&stroke, 0, 0.01);
        let coarse = scratch.render(&stroke, 0, 2.0);
        assert!(coarse * 2 < fine, "fine={fine}, coarse={coarse}");
        assert_eq!(&scratch.output[..3], stroke.source_point(0));
        assert_eq!(
            &scratch.output[scratch.output.len() - 3..],
            stroke.source_point(127)
        );
    }
    #[test]
    fn append_changes_only_previous_tail_span_and_chunk_bounds_cover_geometry() {
        let mut stroke = wave(128);
        let stable = span(&stroke, 126);
        let old_tail = span(&stroke, 127);
        std::rc::Rc::get_mut(&mut stroke.points)
            .unwrap()
            .push(Point::from_precise(
                f64::from(128.0_f32 * 0.6),
                f64::from((128.0_f32 * 0.055).sin() * 12.0),
                0.5,
            ).unwrap());
        assert_eq!(stable, span(&stroke, 126));
        assert_ne!(old_tail, span(&stroke, 127));
        let mut scratch = Scratch::default();
        for chunk in 0..2 {
            let bounds = chunk_bounds(&stroke, chunk).unwrap();
            scratch.render(&stroke, chunk, 0.001);
            for point in scratch.output.as_chunks::<3>().0 {
                assert!(point[0] - point[2] >= bounds[0] - 0.0001);
                assert!(point[1] - point[2] >= bounds[1] - 0.0001);
                assert!(point[0] + point[2] <= bounds[2] + 0.0001);
                assert!(point[1] + point[2] <= bounds[3] + 0.0001);
            }
        }
    }
    #[test]
    fn output_is_bounded_for_extreme_detail_and_invalid_chunks_are_empty() {
        let stroke = wave(128);
        let mut scratch = Scratch::default();
        assert!(scratch.render(&stroke, 0, 0.000001) <= MAX_CHUNK_SEGMENTS);
        assert_eq!(scratch.render(&stroke, usize::MAX, 0.25), 0);
        assert!(scratch.output.is_empty());
        assert!(chunk_bounds(&stroke, usize::MAX).is_none());
    }
}
