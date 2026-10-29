//! Shared Pick geometry predicate over disposable retained capsule batches.
//! Input is source-local f64, never a second document or an editing command.
use std::cell::RefCell;
const VALUES: usize = 256 * 6;
thread_local! {
    pub(super) static INPUT: RefCell<[f64; VALUES]> = const { RefCell::new([0.0; VALUES]) };
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn pick_input_ptr() -> *mut f64 {
    INPUT.with(|input| input.borrow_mut().as_mut_ptr())
}
/// Same tapered-disc distance and tie conditions as the approved prototype.
pub(super) fn capsule_distance(x: f64, y: f64, c: &[f64]) -> f64 {
    let [ax, ay, ar, bx, by, br] = [c[0], c[1], c[2], c[3], c[4], c[5]];
    let dx = bx - ax;
    let dy = by - ay;
    let length = dx * dx + dy * dy;
    let dr = br - ar;
    let mut t = if br > ar { 1.0 } else { 0.0 };
    if length > dr * dr + 0.000001 {
        let u = ((x - ax) * dx + (y - ay) * dy) / length;
        let cross = (x - ax) * dy - (y - ay) * dx;
        t = (u + (dr * cross.abs()) / (length * (length - dr * dr)).sqrt() / length.sqrt())
            .clamp(0.0, 1.0);
    }
    (x - (ax + t * dx)).hypot(y - (ay + t * dy)) - (ar + t * dr)
}
/// Returns 1 for hit, 0 for miss, 2 for rejected input. At most 256 capsules.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn pick_capsules(count: usize, x: f64, y: f64, pad: f64) -> u32 {
    if count > VALUES / 6 || !x.is_finite() || !y.is_finite() || !pad.is_finite() || pad < 0.0 {
        return 2;
    }
    INPUT.with(|input| {
        let input = input.borrow();
        let input = &input[..count * 6];
        if input.iter().any(|value| !value.is_finite())
            || input.chunks_exact(6).any(|c| c[2] < 0.0 || c[5] < 0.0)
        {
            return 2;
        }
        input
            .chunks_exact(6)
            .any(|c| c[2].max(c[5]) > 0.0 && capsule_distance(x, y, c) <= pad) as u32
    })
}
