use crate::Sample;
pub(crate) fn hull(previous: Sample, current: Sample) -> Option<[f64; 4]> {
    let dx = (i128::from(current.x.region) - i128::from(previous.x.region)) as f64 * 65536.0
        + current.x.local
        - previous.x.local;
    let dy = (i128::from(current.y.region) - i128::from(previous.y.region)) as f64 * 65536.0
        + current.y.local
        - previous.y.local;
    let magnitude = dx.abs().max(dy.abs());
    if magnitude == 0.0 {
        return None;
    }
    let ax = dx / magnitude;
    let ay = dy / magnitude;
    let norm = (ax * ax + ay * ay).sqrt();
    let distance = magnitude * norm;
    let delta = previous.radius - current.radius;
    let uncertainty = 8.0 * f64::EPSILON * (distance + delta.abs());
    if distance == 0.0 || distance < delta.abs() - uncertainty {
        return None;
    }
    let ux = ax / norm;
    let uy = ay / norm;
    let a = (delta / distance).clamp(-1.0, 1.0);
    let b = ((1.0 - a) * (1.0 + a)).max(0.0).sqrt();
    Some([
        a * ux + b * uy,
        a * uy - b * ux,
        a * ux - b * uy,
        a * uy + b * ux,
    ])
}
pub(crate) fn disc(
    x: f64,
    y: f64,
    r: f64,
    points: &mut Vec<f32>,
    weights: &mut Vec<f32>,
    verbs: &mut Vec<u8>,
) {
    verbs.extend_from_slice(&[0, 2, 2, 2, 2, 3]);
    for value in [
        x + r,
        y,
        x + r,
        y + r,
        x,
        y + r,
        x - r,
        y + r,
        x - r,
        y,
        x - r,
        y - r,
        x,
        y - r,
        x + r,
        y - r,
        x + r,
        y,
    ] {
        points.push(value as f32);
    }
    weights.extend_from_slice(&[std::f32::consts::FRAC_1_SQRT_2; 4]);
}
pub(crate) fn quad(
    previous: [f64; 3],
    current: [f64; 3],
    normals: [f64; 4],
    points: &mut Vec<f32>,
    verbs: &mut Vec<u8>,
) {
    verbs.extend_from_slice(&[0, 1, 1, 1, 3]);
    for (sample, offset) in [(previous, 0), (current, 0), (current, 2), (previous, 2)] {
        points.push((sample[0] + sample[2] * normals[offset]) as f32);
        points.push((sample[1] + sample[2] * normals[offset + 1]) as f32);
    }
}
