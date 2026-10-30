use super::{measure::fail, Job, STATE};
pub(super) const OUTPUT_LIMIT: usize = 128 * 1024 * 1024;
pub(super) const INPUT_CAPACITY: usize = 49152;
#[derive(Default)]
pub(super) struct Writer {
    pub text: Vec<u8>,
    pub input: Vec<u8>,
    pub phase: u32,
    pub bytes: usize,
    pub images: usize,
    pub png: super::png::Png,
}
pub(super) fn admit(j: &mut Job, count: usize) -> bool {
    j.xml.text.clear();
    let Some(total) = j
        .xml
        .bytes
        .checked_add(count)
        .filter(|n| *n <= OUTPUT_LIMIT)
    else {
        fail(j, 5);
        return false;
    };
    if j.xml.text.try_reserve(count).is_err() {
        fail(j, 6);
        return false;
    }
    j.xml.bytes = total;
    true
}
fn emit(j: &mut Job, text: &str) -> usize {
    if !admit(j, text.len()) {
        return 0;
    }
    j.xml.text.extend_from_slice(text.as_bytes());
    j.xml.text.len()
}
pub(super) fn expected(j: &Job) -> usize {
    j.layout.groups + usize::from(j.layout.view[5] != 0.0)
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn svg_xml_begin(token: u32) -> usize {
    STATE.with(|s| {
        let mut s = s.borrow_mut();
        let Some(j) = s.job.as_mut().filter(|j| j.token == token) else { return 0 };
        if ![2,3].contains(&j.state) || j.layout.state != 2 || j.xml.phase != 0 { return fail(j,3) as usize; }
        if j.xml.input.try_reserve_exact(INPUT_CAPACITY).is_err() { return fail(j,6) as usize; }
        j.xml.input.resize(INPUT_CAPACITY,0);
        let [x,y,w,h,_,_,_,pw,ph] = j.layout.view;
        let text = format!("<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"{pw}\" height=\"{ph}\" viewBox=\"{x} {y} {w} {h}\"><desc>Linefield appearance-preserving export with embedded lossless raster artwork.</desc>");
        j.xml.phase = 1;
        emit(j,&text)
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn svg_xml_image_begin(token: u32) -> usize {
    STATE.with(|s| {
        let mut s = s.borrow_mut();
        let Some(j) = s.job.as_mut().filter(|j| j.token == token) else { return 0 };
        if ![2,3].contains(&j.state) || j.xml.phase != 1 || j.xml.images >= expected(j) { return fail(j,3) as usize; }
        let [x,y,w,h,_,_,_,_,_] = j.layout.view;
        j.xml.phase = 2;
        j.xml.png = Default::default();
        emit(j,&format!("<image x=\"{x}\" y=\"{y}\" width=\"{w}\" height=\"{h}\" href=\"data:image/png;base64,"))
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn svg_xml_finish(token: u32) -> usize {
    STATE.with(|s| {
        let mut s = s.borrow_mut();
        let Some(j) = s.job.as_mut().filter(|j| j.token == token) else {
            return 0;
        };
        if j.state != 3 || j.xml.phase != 1 || j.xml.images != expected(j) {
            return fail(j, 3) as usize;
        }
        j.xml.phase = 3;
        emit(j, "</svg>")
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn svg_text_ptr(token: u32) -> *const u8 {
    STATE.with(|s| {
        s.borrow()
            .job
            .as_ref()
            .filter(|j| j.token == token && [2, 3].contains(&j.state))
            .map_or(std::ptr::null(), |j| j.xml.text.as_ptr())
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn svg_png_input_ptr(token: u32) -> *mut u8 {
    STATE.with(|s| {
        s.borrow_mut()
            .job
            .as_mut()
            .filter(|j| j.token == token && [2, 3].contains(&j.state) && j.xml.phase == 2)
            .map_or(std::ptr::null_mut(), |j| j.xml.input.as_mut_ptr())
    })
}
