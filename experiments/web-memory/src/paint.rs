// Candidate tangent hull, plus exact rational-circle conics supplied separately.
pub fn observe(fields: &[&str]) {
    let v: Vec<f64> = fields
        .iter()
        .map(|v| v.parse().expect("synthetic-paint"))
        .collect();
    let [x0, y0, x1, y1, r0, r1] = v[..] else {
        panic!("paint-arity")
    };
    let dx = x1 - x0;
    let dy = y1 - y0;
    let magnitude = dx.abs().max(dy.abs());
    if magnitude == 0.0 {
        println!("P contained");
        return;
    }
    let ax = dx / magnitude;
    let ay = dy / magnitude;
    let norm = (ax * ax + ay * ay).sqrt();
    let distance = magnitude * norm;
    let delta = r0 - r1;
    let uncertainty = 8.0 * f64::EPSILON * (distance + delta.abs());
    if distance == 0.0 || distance < delta.abs() - uncertainty {
        println!("P contained");
        return;
    }
    let ux = ax / norm;
    let uy = ay / norm;
    let a = (delta / distance).clamp(-1.0, 1.0);
    let b = ((1.0 - a) * (1.0 + a)).max(0.0).sqrt();
    print!("P hull");
    for sign in [-1.0, 1.0] {
        let nx = a * ux - sign * b * uy;
        let ny = a * uy + sign * b * ux;
        for (x, y, radius) in [(x0, y0, r0), (x1, y1, r1)] {
            for value in [x + radius * nx, y + radius * ny] {
                print!(" {} {}", value.to_bits(), (value as f32).to_bits());
            }
        }
    }
    println!();
}
