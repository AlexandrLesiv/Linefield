//! Disposable pure geometry executor. Deliberately no editor-engine dependency.
#![forbid(unsafe_code)]
use linefield_editor_geometry::{Preparation, PreparedPage};
use wasm_bindgen::prelude::*;
#[wasm_bindgen(inline_js = r#"
const apply=Reflect.apply, typed=Object.getPrototypeOf(Float64Array.prototype);
const getter=(p,k)=>Object.getOwnPropertyDescriptor(p,k).get;
const length=getter(typed,'length'),buffer=getter(typed,'buffer'),tag=getter(typed,Symbol.toStringTag);
const bytes=getter(ArrayBuffer.prototype,'byteLength'),resize=Object.getOwnPropertyDescriptor(ArrayBuffer.prototype,'resizable')?.get,set=typed.set;
const ByteArray=Uint8Array;
export function geometryLength(v){if(apply(tag,v,[])!=='Float64Array')throw 'invalid';const b=apply(buffer,v,[]);apply(bytes,b,[]);if(resize&&apply(resize,b,[]))throw 'invalid';new ByteArray(b,0,0);return apply(length,v,[]);}
export function geometryCopy(dst,src){apply(set,dst,[src]);}
"#)]
extern "C" {
    #[wasm_bindgen(catch, js_name=geometryLength)]
    fn length(value: &JsValue) -> Result<f64, JsValue>;
    #[wasm_bindgen(catch, js_name=geometryCopy)]
    fn copy(destination: &mut [f64], source: &JsValue) -> Result<(), JsValue>;
}
fn failure(value: &str) -> JsValue {
    JsValue::from_str(value)
}
#[wasm_bindgen]
pub struct GeometryPreparation(Preparation);
#[wasm_bindgen]
pub struct GeometryResult(PreparedPage);
#[wasm_bindgen(js_name=prepareBegin)]
pub fn begin(
    #[wasm_bindgen(unchecked_param_type = "Float64Array")] points: JsValue,
    #[wasm_bindgen(unchecked_param_type = "Float64Array")] parameters: JsValue,
) -> Result<GeometryPreparation, JsValue> {
    let n = length(&points)?;
    if !n.is_finite()
        || n.fract() != 0.0
        || !(3.0..=396.0).contains(&n)
        || !(n as usize).is_multiple_of(3)
        || length(&parameters)? != 8.0
    {
        return Err(failure("invalid"));
    }
    let mut raw = [0.0; 396];
    let mut p = [0.0; 8];
    copy(&mut raw[..n as usize], &points)?;
    copy(&mut p, &parameters)?;
    if p.iter().any(|v| !v.is_finite())
        || p[0].fract() != 0.0
        || p[1].fract() != 0.0
        || p[0] < 0.0
        || p[1] > 132.0
        || !(p[3] == 0.0 || p[3] == 1.0)
    {
        return Err(failure("invalid"));
    }
    let mut input = [[0.0; 3]; 132];
    for (i, row) in raw[..n as usize].as_chunks::<3>().0.iter().enumerate() {
        input[i].copy_from_slice(row);
    }
    let clip = if p[3] == 1.0 {
        Some([p[4], p[5], p[6], p[7]])
    } else {
        None
    };
    Preparation::new(
        &input[..n as usize / 3],
        p[0] as usize,
        p[1] as usize,
        p[2],
        clip,
    )
    .map(GeometryPreparation)
    .map_err(failure)
}
#[wasm_bindgen]
impl GeometryPreparation {
    #[wasm_bindgen(js_name=nextPage)]
    pub fn next_page(&mut self) -> Result<GeometryResult, JsValue> {
        self.0.page().map(GeometryResult).map_err(failure)
    }
}
#[wasm_bindgen]
impl GeometryResult {
    #[wasm_bindgen(getter)]
    pub fn done(&self) -> bool {
        self.0.done
    }
    #[wasm_bindgen(getter)]
    pub fn origin(&self) -> Box<[f64]> {
        Box::new(self.0.origin)
    }
    #[wasm_bindgen(getter)]
    pub fn data(&mut self) -> Box<[f32]> {
        std::mem::take(&mut self.0.data).into_boxed_slice()
    }
}
