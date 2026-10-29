//! Canonical one-axis address arithmetic. Hosts transport regions as i64/BigInt,
//! never flattening them to a JavaScript number. Canonical samples use these
//! addresses; regional view and rendering adoption remains separate.
use std::cell::Cell;

const REGION_SIZE: f64 = 65536.0;
#[derive(Clone, Copy)]
pub(crate) struct Address {
    pub(crate) region: i64,
    pub(crate) local: f64,
}
impl Address {
    /// Transitional compatibility projection, never canonical storage.
    pub(crate) fn legacy_f32(self) -> f32 {
        (self.region as f64 * REGION_SIZE + self.local) as f32
    }
    pub(crate) fn normalized(region: i64, local: f64) -> Option<Self> {
        if !local.is_finite() {
            return None;
        }
        let carry = (local / REGION_SIZE).floor();
        // A carry outside this interval cannot land in i64 from an i64 region.
        // Convert via i128: i64::MAX rounded to f64 is already out of range.
        if carry.abs() > 18446744073709551616.0 {
            return None;
        }
        let mut whole = i128::from(region) + carry as i128;
        let mut remainder = local - carry * REGION_SIZE;
        // Correct rounding at a region boundary without saturating the address.
        if remainder >= REGION_SIZE {
            remainder -= REGION_SIZE;
            whole += 1;
        } else if remainder < 0.0 {
            remainder += REGION_SIZE;
            whole -= 1;
        }
        let region = i64::try_from(whole).ok()?;
        if !(0.0..REGION_SIZE).contains(&remainder) {
            return None;
        }
        Some(Self {
            region,
            local: if remainder == 0.0 { 0.0 } else { remainder },
        })
    }
    fn offset(self, delta: f64) -> Option<Self> {
        // Normalize delta before adding its remainder; adding a huge delta to
        // local directly would discard the address's fractional precision.
        if !delta.is_finite() {
            return None;
        }
        let whole = (delta / REGION_SIZE).floor();
        if whole.abs() > 18446744073709551616.0 {
            return None;
        }
        let remainder = delta - whole * REGION_SIZE;
        let combined = self.local + remainder;
        let carry = (combined / REGION_SIZE).floor() as i128;
        let region = i64::try_from(i128::from(self.region) + whole as i128 + carry).ok()?;
        Self::normalized(region, combined % REGION_SIZE)
    }
}
thread_local! {
    static RESULT: Cell<Address> = const { Cell::new(Address { region: 0, local: 0.0 }) };
}
fn publish(value: Option<Address>) -> u32 {
    if let Some(address) = value {
        RESULT.with(|result| result.set(address));
        1
    } else {
        0
    }
}
/// Returns 0 without changing output for nonfinite input or address overflow.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn regional_normalize(region: i64, local: f64) -> u32 {
    publish(Address::normalized(region, local))
}
/// Adds a finite displacement to an already normalized canonical address.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn regional_offset(region: i64, local: f64, delta: f64) -> u32 {
    if !(0.0..REGION_SIZE).contains(&local) {
        return 0;
    }
    publish(Address { region, local }.offset(delta))
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn regional_result_region() -> i64 {
    RESULT.with(|result| result.get().region)
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn regional_result_local() -> f64 {
    RESULT.with(|result| result.get().local)
}
