use crate::Code;
pub(crate) fn page_extent(detail: f64) -> f64 {
    // Bound vertex intermediates as well as packed f32 coordinate precision.
    4096.0_f64.min(4096.0 / detail)
}
pub(crate) fn placement(
    values: [f64; 6],
    bounds: [f64; 4],
    radius: f64,
    scale: f64,
    viewport: f64,
) -> Result<[f32; 6], Code> {
    let m = values.map(|v| v as f32);
    let x = bounds[0].abs().max(bounds[2].abs());
    let y = bounds[1].abs().max(bounds[3].abs());
    let coefficient = [0, 1]
        .map(|i| (values[i] - m[i] as f64).abs() * x + (values[i + 2] - m[i + 2] as f64).abs() * y);
    let translation = [values[4] - m[4] as f64, values[5] - m[5] as f64];
    // GLSL ES 3.00 §4.5.1 permits one ULP, not only round-to-nearest half ULP.
    // https://registry.khronos.org/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf
    let epsilon = 2.0_f64.powi(-23);
    let gamma4 = 4.0 * epsilon / (1.0 - 4.0 * epsilon);
    let arithmetic = [0, 1].map(|i| {
        gamma4 * ((m[i] as f64).abs() * x + (m[i + 2] as f64).abs() * y + (m[i + 4] as f64).abs())
    });
    let gpu =
        arithmetic[0].hypot(arithmetic[1]) + epsilon * (14.0 * radius * scale + 8.0 * viewport);
    // Euclidean allocation: curve .08 + packing sqrt(2)*.01+.01,
    // coefficients .02 + translation sqrt(2)*.01 + vertex arithmetic .07 < .209px.
    // Remaining .041px covers fragment/AA/f64; fragment conformance is bounded
    // GPU evidence, not an exhaustive proof. Radius includes division/sqrt allowances.
    if m.iter().any(|v| !v.is_finite())
        || coefficient[0].hypot(coefficient[1]) > 0.02
        || translation.iter().any(|v| v.abs() > 0.01)
        || gpu > 0.07
    {
        return Err(Code::NumericalCapacity);
    }
    Ok(m)
}
