//! Length/type inspection precedes every copy; captured intrinsics avoid caller getters.
use wasm_bindgen::prelude::*;
#[wasm_bindgen(inline_js = r#"
const apply = Reflect.apply;
const typed = Object.getPrototypeOf(Float32Array.prototype);
const get = (prototype, name) => Object.getOwnPropertyDescriptor(prototype, name).get;
const length = get(typed, 'length');
const buffer = get(typed, 'buffer');
const tag = get(typed, Symbol.toStringTag);
const bytes = get(ArrayBuffer.prototype, 'byteLength');
const resizable = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'resizable')?.get;
const set = typed.set;
const ByteArray = Uint8Array;
export function preparationLength(value, kind) {
  if (apply(tag, value, []) !== kind) throw 'invalid';
  const backing = apply(buffer, value, []);
  apply(bytes, backing, []);
  if (resizable && apply(resizable, backing, [])) throw 'invalid';
  new ByteArray(backing, 0, 0);
  return apply(length, value, []);
}
export function preparationCopy(destination, source) { apply(set, destination, [source]); }
"#)]
extern "C" {
    #[wasm_bindgen(catch, js_name = preparationLength)]
    fn length(value: &JsValue, kind: &str) -> Result<f64, JsValue>;
    #[wasm_bindgen(catch, js_name = preparationCopy)]
    fn copy_bytes(destination: &mut [u8], source: &JsValue) -> Result<(), JsValue>;
    #[wasm_bindgen(catch, js_name = preparationCopy)]
    fn copy_floats(destination: &mut [f32], source: &JsValue) -> Result<(), JsValue>;
}
pub(crate) struct Input {
    pub verbs: [u8; 192],
    pub points: [f32; 576],
    pub weights: [f32; 128],
    pub counts: [usize; 3],
}
pub(crate) fn read(verbs: JsValue, points: JsValue, weights: JsValue) -> Result<Input, JsValue> {
    let checked = |value: &JsValue, kind, max| -> Result<usize, JsValue> {
        let n = length(value, kind)?;
        if !n.is_finite() || n.fract() != 0.0 || n < 0.0 || n > max {
            Err(JsValue::from_str("invalid"))
        } else {
            Ok(n as usize)
        }
    };
    let counts = [
        checked(&verbs, "Uint8Array", 192.0)?,
        checked(&points, "Float32Array", 576.0)?,
        checked(&weights, "Float32Array", 128.0)?,
    ];
    let total = counts[1]
        .checked_add(counts[2])
        .and_then(|n| n.checked_mul(4))
        .and_then(|n| n.checked_add(counts[0]))
        .ok_or_else(|| JsValue::from_str("invalid"))?;
    if total > 4096 {
        return Err(JsValue::from_str("invalid"));
    }
    let mut result = Input {
        verbs: [0; 192],
        points: [0.0; 576],
        weights: [0.0; 128],
        counts,
    };
    copy_bytes(&mut result.verbs[..counts[0]], &verbs)?;
    copy_floats(&mut result.points[..counts[1]], &points)?;
    copy_floats(&mut result.weights[..counts[2]], &weights)?;
    Ok(result)
}
