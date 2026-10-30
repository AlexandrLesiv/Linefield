include!("generated.rs");
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn svg_boundary_fingerprint(index: usize) -> u32 {
    SVG_FINGERPRINT.get(index).copied().unwrap_or(0)
}
