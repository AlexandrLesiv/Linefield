// One-axis exact painted-AABB rejection, before any relative f64/f32 projection.
use crate::magnitude::{Magnitude, decode, signed_add};
type Signed = (bool, Magnitude);

fn relative(region: i64, local: f64, center_region: i64, center_local: f64) -> Signed {
    let delta = i128::from(region) - i128::from(center_region);
    let regional = (
        delta < 0,
        Magnitude::small(u64::try_from(delta.unsigned_abs()).unwrap()).shift(1090),
    );
    let center = decode(-center_local);
    signed_add(signed_add(regional, decode(local)), center)
}

fn larger(left: Signed, right: Signed) -> bool {
    if left.1.width() == 0 && right.1.width() == 0 {
        return false;
    }
    match (left.0, right.0) {
        (false, true) => true,
        (true, false) => false,
        (false, false) => left.1.compare(right.1).is_gt(),
        (true, true) => left.1.compare(right.1).is_lt(),
    }
}

pub fn observe(fields: &[&str]) {
    let regions: Vec<i64> = [0, 2, 4].map(|i| fields[i].parse().unwrap()).to_vec();
    let v: Vec<f64> = [1, 3, 5, 6, 7, 8, 9]
        .map(|i| fields[i].parse().unwrap())
        .to_vec();
    let [minimum, maximum, center, zoom, extent, radius, fringe] = v[..] else {
        unreachable!()
    };
    assert!((0.1..=8.0).contains(&zoom) && (1.0..=8192.0).contains(&extent));
    assert!((0.05..=256.0).contains(&radius) && (0.0..=4096.0).contains(&fringe));
    assert!(
        [minimum, maximum, center]
            .iter()
            .all(|v| (0.0..65536.0).contains(v))
    );
    let zoom_bits = zoom.to_bits();
    let mantissa = (zoom_bits & ((1_u64 << 52) - 1)) | (1_u64 << 52);
    let exponent = ((zoom_bits >> 52) & 2047) as i32 - 1023 - 52;
    let span = relative(regions[1], maximum, regions[0], minimum);
    assert!(!span.0 || span.1.width() == 0);
    assert!(!larger(span, decode(163840.0 + 2_f64.powi(-35))));
    let lower = signed_add(
        relative(regions[0], minimum, regions[2], center),
        decode(-radius),
    );
    let upper = signed_add(
        relative(regions[1], maximum, regions[2], center),
        decode(radius),
    );
    let half = signed_add(decode(extent / 2.0), decode(fringe))
        .1
        .shift((-exponent) as usize);
    let scaled_lower = (lower.0, lower.1.multiply(mantissa));
    let scaled_upper = (upper.0, upper.1.multiply(mantissa));
    if larger(scaled_lower, (false, half)) || larger((true, half), scaled_upper) {
        println!("C outside");
        return;
    }
    print!("C eligible");
    for (region, local, offset) in [
        (regions[0], minimum, -radius),
        (regions[1], maximum, radius),
    ] {
        let delta = i128::from(region) - i128::from(regions[2]);
        assert!(delta.abs() <= 5);
        let projected = ((delta as f64 * 65536.0 + local - center) + offset) * zoom + extent / 2.0;
        assert!(projected.abs() < 2_f64.powi(21));
        print!(" {} {}", projected.to_bits(), (projected as f32).to_bits());
    }
    println!();
}
