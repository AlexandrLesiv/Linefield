use linefield_editor_engine::{Code, Engine, Projection};
use std::cell::{Cell, RefCell};
use std::rc::Rc;
use wasm_bindgen::prelude::*;
thread_local! {
    static ENGINE: RefCell<Engine> = RefCell::new(Engine::default());
    static LIVE: Cell<bool> = const { Cell::new(false) };
    static BUSY: Cell<bool> = const { Cell::new(false) };
}
#[derive(Default)]
pub struct Payload {
    pub pan_preview: linefield_editor_engine::PanPreview,
    pub page: linefield_editor_engine::GeometryPage,
    pub ids: Vec<u64>,
    pub done: bool,
    pub geometry: u64,
    pub verbs: u64,
    pub terminal: bool,
}
pub struct Data {
    pub payload: RefCell<Payload>,
    pub arrays: Cell<u8>,
    pub value: Cell<Projection>,
    pub consumed: Cell<bool>,
    _reserved: Vec<u8>,
}
impl Drop for Data {
    fn drop(&mut self) {
        LIVE.set(false);
    }
}
pub struct Slot(pub Rc<Data>);
struct Guard;
impl Drop for Guard {
    fn drop(&mut self) {
        BUSY.set(false);
    }
}
pub fn id(value: JsValue) -> Result<u64, Code> {
    if !value.is_bigint() {
        return Err(Code::Invalid);
    }
    u64::try_from(value.unchecked_into::<js_sys::BigInt>()).map_err(|_| Code::Invalid)
}
pub fn number(value: JsValue) -> Result<f64, Code> {
    value
        .as_f64()
        .filter(|v| v.is_finite())
        .ok_or(Code::Invalid)
}
pub fn execute<S>(operation: impl FnOnce(&mut Engine) -> Code) -> Result<JsValue, JsValue>
where
    S: From<Slot> + Into<JsValue>,
{
    execute_data::<S>(|engine, _| operation(engine))
}
pub fn execute_data<S>(
    operation: impl FnOnce(&mut Engine, &Data) -> Code,
) -> Result<JsValue, JsValue>
where
    S: From<Slot> + Into<JsValue>,
{
    if BUSY.replace(true) {
        return Err(JsValue::from_str("boundary-unavailable"));
    }
    let _guard = Guard;
    if LIVE.get() {
        return Err(JsValue::from_str("boundary-capacity"));
    }
    // Reserve before *any* engine mutation, including the generated class wrapper allocation.
    // Into<JsValue> below constructs that wrapper now; returning the existing handle allocates none.
    let mut reserved = Vec::new();
    reserved
        .try_reserve_exact(256)
        .map_err(|_| JsValue::from_str("boundary-capacity"))?;
    let value = ENGINE.with(|engine| engine.borrow().projection(Code::Unavailable));
    let data = Rc::new(Data {
        payload: RefCell::new(Payload::default()),
        arrays: Cell::new(0),
        value: Cell::new(value),
        consumed: Cell::new(false),
        _reserved: reserved,
    });
    LIVE.set(true);
    let result = S::from(Slot(Rc::clone(&data))).into();
    ENGINE.with(|engine| {
        if let Ok(mut engine) = engine.try_borrow_mut() {
            engine.reset_outcome();
            let code = operation(&mut engine, &data);
            data.value.set(engine.projection(code));
        }
    });
    Ok(result)
}
#[cfg(feature = "e2e-fixtures")]
#[wasm_bindgen(js_name = fixtureNearExhaustion)]
pub fn fixture_near_exhaustion() -> Result<(), JsValue> {
    seed_fixture(Engine::fixture_near_exhaustion())
}
#[cfg(feature = "e2e-fixtures")]
#[wasm_bindgen(js_name = fixtureNearPanExhaustion)]
pub fn fixture_near_pan_exhaustion() -> Result<(), JsValue> {
    seed_fixture(Engine::fixture_near_pan_exhaustion())
}
#[cfg(feature = "e2e-fixtures")]
fn seed_fixture(value: Engine) -> Result<(), JsValue> {
    if LIVE.get() || BUSY.get() {
        return Err(JsValue::from_str("boundary-capacity"));
    }
    let active = ENGINE.with(|engine| engine.borrow().projection(Code::Ok).owner != 0);
    if active {
        return Err(JsValue::from_str("fixture-active-owner"));
    }
    ENGINE.with(|engine| *engine.borrow_mut() = value);
    Ok(())
}
#[cfg(feature = "e2e-fixtures")]
thread_local! { static FAIL_METRICS: Cell<bool> = const { Cell::new(false) }; }
#[cfg(feature = "e2e-fixtures")]
#[wasm_bindgen(js_name = fixtureFailNextMetrics)]
pub fn fixture_fail_next_metrics() {
    FAIL_METRICS.set(true);
}
#[cfg(feature = "e2e-fixtures")]
pub fn fail_metrics_if_armed() {
    if FAIL_METRICS.replace(false) {
        #[cfg(target_arch = "wasm32")]
        std::arch::wasm32::unreachable();
        #[cfg(not(target_arch = "wasm32"))]
        panic!("isolated fixture trap");
    }
}
