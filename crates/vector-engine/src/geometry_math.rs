// One policy source instantiated by the narrow and wide coordinate modules.
include!("geometry_curves.rs");
include!("geometry_tessellation.rs");

/// Conservative bounds include the cubic control hull expanded by the largest
/// endpoint radius. Simplification chords remain inside this same convex hull.
pub(crate) fn chunk_bounds(stroke: &Stroke, chunk: usize) -> Option<[Real; 4]> {
    let range = chunk_range(stroke, chunk)?;
    let mut bounds = [
        Real::INFINITY,
        Real::INFINITY,
        Real::NEG_INFINITY,
        Real::NEG_INFINITY,
    ];
    for index in range {
        let curve = span(stroke, index);
        let radius = curve[0][2].max(curve[3][2]);
        for point in curve {
            bounds[0] = bounds[0].min(point[0] - radius);
            bounds[1] = bounds[1].min(point[1] - radius);
            bounds[2] = bounds[2].max(point[0] + radius);
            bounds[3] = bounds[3].max(point[1] + radius);
        }
    }
    Some(bounds)
}


fn render_point(stroke: &Stroke, index: usize) -> Position {
    if stroke.slice.is_some() {
        let t = stroke.parameter(index);
        if t.fract() != 0.0 { return evaluate(source_span(stroke, t.floor() as usize + 1), t.fract()); }
        return source_point(stroke, t.floor() as usize);
    }
    source_point(stroke, index)
}
