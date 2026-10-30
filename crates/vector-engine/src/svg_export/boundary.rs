use super::STATE;
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn svg_status(token: u32) -> u32 {
    STATE.with(|s| {
        s.borrow()
            .job
            .as_ref()
            .filter(|j| j.token == token)
            .map_or(0, |j| j.state)
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn svg_revision(token: u32) -> u64 {
    STATE.with(|s| {
        s.borrow()
            .job
            .as_ref()
            .filter(|j| j.token == token)
            .map_or(0, |j| j.revision)
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn svg_retained_bytes(token: u32) -> usize {
    STATE.with(|s| {
        s.borrow()
            .job
            .as_ref()
            .filter(|j| j.token == token)
            .map_or(0, |j| j.retained)
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn svg_origin_region(token: u32, axis: usize) -> i64 {
    STATE.with(|s| {
        s.borrow()
            .job
            .as_ref()
            .filter(|j| j.token == token)
            .and_then(|j| j.origin)
            .and_then(|o| o.get(axis).copied())
            .map_or(0, |a| a.region)
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn svg_origin_local(token: u32, axis: usize) -> f64 {
    STATE.with(|s| {
        s.borrow()
            .job
            .as_ref()
            .filter(|j| j.token == token)
            .and_then(|j| j.origin)
            .and_then(|o| o.get(axis).copied())
            .map_or(0.0, |a| a.local)
    })
}
/// Captured paper(0)/grid(1), including an empty document. Invalid/unsealed is u32::MAX.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn svg_setting(token: u32, index: usize) -> u32 {
    STATE.with(|s| {
        s.borrow()
            .job
            .as_ref()
            .filter(|j| j.token == token && [2, 3].contains(&j.state))
            .and_then(|j| j.settings.get(index).copied())
            .unwrap_or(u32::MAX)
    })
}
