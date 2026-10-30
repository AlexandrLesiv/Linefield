use super::{
    measure::fail,
    xml::{admit, INPUT_CAPACITY},
    STATE,
};
const ALPHABET: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
#[derive(Default)]
pub(super) struct Png {
    validator: super::png_validate::Validator,
    carry: [u8; 3],
    pending: usize,
}
fn quartet(text: &mut Vec<u8>, p: [u8; 3], count: usize) {
    text.extend_from_slice(&[
        ALPHABET[(p[0] >> 2) as usize],
        ALPHABET[(((p[0] & 3) << 4) | (p[1] >> 4)) as usize],
        if count > 1 {
            ALPHABET[(((p[1] & 15) << 2) | (p[2] >> 6)) as usize]
        } else {
            b'='
        },
        if count > 2 {
            ALPHABET[(p[2] & 63) as usize]
        } else {
            b'='
        },
    ]);
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn svg_png_write(token: u32, length: usize) -> usize {
    STATE.with(|s| {
        let mut s = s.borrow_mut();
        let Some(j) = s.job.as_mut().filter(|j| j.token == token) else {
            return 0;
        };
        if ![2, 3].contains(&j.state) || j.xml.phase != 2 || length == 0 || length > INPUT_CAPACITY
        {
            return fail(j, 3) as usize;
        }
        let count = ((length + j.xml.png.pending) / 3) * 4;
        if !admit(j, count) {
            return 0;
        }
        for i in 0..length {
            let byte = j.xml.input[i];
            let p = &mut j.xml.png;
            if !p
                .validator
                .push(byte, j.layout.view[7] as u32, j.layout.view[8] as u32)
            {
                return fail(j, 4) as usize;
            }
            p.carry[p.pending] = byte;
            p.pending += 1;
            if p.pending == 3 {
                quartet(&mut j.xml.text, p.carry, 3);
                p.pending = 0;
                p.carry = [0; 3];
            }
        }
        j.xml.text.len()
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn svg_xml_image_end(token: u32) -> usize {
    STATE.with(|s| {
        let mut s = s.borrow_mut();
        let Some(j) = s.job.as_mut().filter(|j| j.token == token) else {
            return 0;
        };
        if ![2, 3].contains(&j.state) || j.xml.phase != 2 {
            return fail(j, 3) as usize;
        }
        if !j.xml.png.validator.done() {
            return fail(j, 4) as usize;
        }
        let count = if j.xml.png.pending == 0 { 3 } else { 7 };
        if !admit(j, count) {
            return 0;
        }
        if j.xml.png.pending > 0 {
            quartet(&mut j.xml.text, j.xml.png.carry, j.xml.png.pending);
        }
        j.xml.text.extend_from_slice(b"\"/>");
        j.xml.images += 1;
        j.xml.phase = 1;
        j.xml.text.len()
    })
}
