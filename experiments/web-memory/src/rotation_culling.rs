//! One projected painted AABB axis; opposite regional extremes remain exact.
use crate::magnitude::{Magnitude, decode, signed_add};
type Signed = (bool, Magnitude);
fn weighted(value: Signed, coefficient: f64) -> Signed {
    if coefficient == 0.0 {
        return (false, Magnitude::small(0));
    }
    let bits = coefficient.to_bits();
    let exponent = ((bits >> 52) & 2047) as i32 - 1023 - 52;
    let mantissa = (bits & ((1_u64 << 52) - 1)) | (1_u64 << 52);
    (
        value.0 != (bits >> 63 != 0),
        value.1.multiply(mantissa).shift((exponent + 54) as usize),
    )
}
fn relative(region: i128, local: f64) -> Signed {
    signed_add(
        (
            region < 0,
            Magnitude::small(u64::try_from(region.unsigned_abs()).expect("region delta"))
                .shift(1090),
        ),
        decode(local),
    )
}
fn greater(left: Signed, right: Signed) -> bool {
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
    let rx = fields[0].parse().expect("region x");
    let ry = fields[1].parse().expect("region y");
    let v: Vec<f64> = fields[2..8]
        .iter()
        .map(|s| s.parse().expect("float"))
        .collect();
    let (x, y, zoom, extent, c, s) = (v[0], v[1], v[2], v[3], v[4], v[5]);
    let point = signed_add(weighted(relative(rx, x), c), weighted(relative(ry, y), s));
    // Conservative maximum-radius square; does not replace whole-stroke bounds.
    let radius = 256.0 + 2_f64.powi(-38);
    let padding = signed_add(
        weighted(decode(radius), c.abs()),
        weighted(decode(radius), s.abs()),
    );
    let lower = signed_add(point, (true, padding.1));
    let upper = signed_add(point, padding);
    let bits = zoom.to_bits();
    let mantissa = (bits & ((1_u64 << 52) - 1)) | (1_u64 << 52);
    let exponent = ((bits >> 52) & 2047) as i32 - 1023 - 52;
    let half = signed_add(decode(extent / 2.0), decode(2.0))
        .1
        .shift((54 - exponent) as usize);
    let outside = greater((lower.0, lower.1.multiply(mantissa)), (false, half))
        || greater((true, half), (upper.0, upper.1.multiply(mantissa)));
    println!("B {}", if outside { "outside" } else { "eligible" });
}
