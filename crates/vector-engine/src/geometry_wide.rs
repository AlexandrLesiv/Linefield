//! The same geometry policy with wide derived coordinates. Raw data is unchanged.
type Real = f64;
fn source_point(stroke: &crate::Stroke, index: usize) -> [Real; 3] {
    let point = stroke.points[index];
    [
        point.x.relative_to(stroke.source_anchor[0]),
        point.y.relative_to(stroke.source_anchor[1]),
        f64::from(stroke.width * 0.5 * stroke.pressure_curve.diameter_fraction(point.pressure)),
    ]
}
include!("geometry_math.rs");
