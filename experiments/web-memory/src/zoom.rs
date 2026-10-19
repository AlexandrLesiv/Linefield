pub fn observe(fields: &[&str]) {
    let zoom: f64 = fields[0].parse().unwrap();
    let direction = fields[1];
    if !zoom.is_finite() || !(0.1..=8.0).contains(&zoom) || !["in", "out"].contains(&direction) {
        println!("E InputBound");
        return;
    }
    let next = if direction == "in" {
        (zoom * 1.25).min(8.0)
    } else {
        (zoom / 1.25).max(0.1)
    };
    println!("Z {}", next.to_bits());
}
