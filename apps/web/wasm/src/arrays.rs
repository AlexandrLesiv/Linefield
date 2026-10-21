//! Captured intrinsic inspection/copy never reads caller properties or iterators.
use linefield_editor_engine::{Code, Input};
use wasm_bindgen::prelude::*;
#[wasm_bindgen(inline_js = r#"
const apply = Reflect.apply;
const typed = Object.getPrototypeOf(Float64Array.prototype);
const get = (prototype, name) => Object.getOwnPropertyDescriptor(prototype, name).get;
const length = get(typed, 'length');
const buffer = get(typed, 'buffer');
const tag = get(typed, Symbol.toStringTag);
const bytes = get(ArrayBuffer.prototype, 'byteLength');
const resizable = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'resizable')?.get;
const set = typed.set;
const ByteArray = Uint8Array;
export function memoryArrayLength(value, kind) {
  if (apply(tag, value, []) !== kind) throw 'invalid-array';
  const backing = apply(buffer, value, []);
  apply(bytes, backing, []);
  if (resizable && apply(resizable, backing, [])) throw 'invalid-array';
  new ByteArray(backing, 0, 0);
  return apply(length, value, []);
}
export function memoryArrayCopy(destination, source) { apply(set, destination, [source]); }
"#)]
extern "C" {
    #[wasm_bindgen(catch, js_name = memoryArrayLength)]
    fn array_length(value: &JsValue, kind: &str) -> Result<f64, JsValue>;
    #[wasm_bindgen(catch, js_name = memoryArrayCopy)]
    fn copy_numbers(destination: &mut [f64], source: &JsValue) -> Result<(), JsValue>;
    #[wasm_bindgen(catch, js_name = memoryArrayCopy)]
    fn copy_flags(destination: &mut [u8], source: &JsValue) -> Result<(), JsValue>;
}
pub fn inputs(
    x: JsValue,
    y: JsValue,
    pressure: JsValue,
    has_pressure: JsValue,
) -> Result<Vec<Input>, Code> {
    let raw_length = array_length(&x, "Float64Array").map_err(|_| Code::Invalid)?;
    if !raw_length.is_finite() || raw_length.fract() != 0.0 || !(1.0..=256.0).contains(&raw_length)
    {
        return Err(Code::Invalid);
    }
    let length = raw_length as usize;
    for value in [&y, &pressure] {
        if array_length(value, "Float64Array").map_err(|_| Code::Invalid)? != raw_length {
            return Err(Code::Invalid);
        }
    }
    if array_length(&has_pressure, "Uint8Array").map_err(|_| Code::Invalid)? != raw_length {
        return Err(Code::Invalid);
    }
    let mut xs = [0.0; 256];
    let mut ys = [0.0; 256];
    let mut pressures = [0.0; 256];
    let mut flags = [0; 256];
    copy_numbers(&mut xs[..length], &x).map_err(|_| Code::Invalid)?;
    copy_numbers(&mut ys[..length], &y).map_err(|_| Code::Invalid)?;
    copy_numbers(&mut pressures[..length], &pressure).map_err(|_| Code::Invalid)?;
    copy_flags(&mut flags[..length], &has_pressure).map_err(|_| Code::Invalid)?;
    let mut result = Vec::new();
    result
        .try_reserve_exact(length)
        .map_err(|_| Code::Capacity)?;
    for index in 0..length {
        if flags[index] > 1 {
            return Err(Code::Invalid);
        }
        result.push(Input {
            x: xs[index],
            y: ys[index],
            pressure: pressures[index],
            present: flags[index] == 1,
        });
    }
    Ok(result)
}
