//! Integer quad operations add zero rounding error after the checked float coverage bound.
use crate::Code;
pub(crate) fn certify(
    matrix: [f32; 6],
    bounds: [f64; 4],
    radius: f64,
    scale: f64,
    detail: f64,
    offset: [i32; 2],
) -> Result<(), Code> {
    let epsilon = 2.0_f64.powi(-23);
    let gamma4 = 4.0 * epsilon / (1.0 - 4.0 * epsilon);
    let add = |a: f64, b: f64| (a + b).next_up();
    let mul = |a: f64, b: f64| (a * b).next_up();
    // Cold descriptors bound f64 source centers; workers bound packed f32 centers.
    // Enclose either producer using the packing contract abs(v-f32)*detail <= .01.
    let packing = (0.01 / detail).next_up();
    let x = add(bounds[0].abs().max(bounds[2].abs()), packing);
    let y = add(bounds[1].abs().max(bounds[3].abs()), packing);
    for i in 0..2 {
        let endpoint = add(
            add(
                mul(f64::from(matrix[i]).abs(), x),
                mul(f64::from(matrix[i + 2]).abs(), y),
            ),
            f64::from(matrix[i + 4]).abs(),
        );
        let endpoint = add(endpoint, mul(gamma4, endpoint));
        // Actual packed radius and highp length/multiply uncertainty, not ideal r alone.
        let radius = mul(add(radius, packing), scale);
        let radius = add(radius, mul(14.0 * epsilon, radius));
        let coverage = add(add(add(endpoint, radius), 2.0), 0.0625);
        let range = add(add(coverage, 2.0), f64::from(offset[i].unsigned_abs()));
        // At <=2^18 each new radius+2 / endpoint±r operation has <=1/32px one-ULP
        // error. Combined<=1/16 plus inherited<.5px viewport coverage uncertainty
        // is <.5625, below the 2-1.414214 extra guard. This is not positional AA error.
        if !coverage.is_finite() || coverage > 262_144.0 || range > 4_194_304.0 {
            return Err(Code::NumericalCapacity);
        }
    }
    // floor/ceil outputs and their integer-offset sums are within +/-2^23, hence exact
    // highp binary32 integers. Clamp produces corners in [0,8192]. The unchanged
    // clip conversion retains the reviewed <.5px viewport coverage premise.
    // Fragment centers are half-integers: backing<=8192, |offset|<=16384, so
    // topLeft-offset is exact within +/-24576. No new route rounding debit is needed.
    // Canonical admission has gamma4*endpoint+14*epsilon*radius<=.07, hence their
    // sum<146801. Packed-radius and rounding slack above cannot reach this 2^18 guard.
    Ok(())
}
