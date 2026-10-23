//! Real shared pan commands with an isolated, fixture-only provenance observer.
use crate::{
    boundary::{execute_data, id, number},
    raster_result::Result,
    snapshots::RasterProofSnapshot,
};
use linefield_editor_engine::{Code, Engine, raster_probe::RasterProbe};
use std::cell::{Cell, RefCell};
use wasm_bindgen::prelude::*;
thread_local! {
    static PROBE: RefCell<RasterProbe> = RefCell::new(RasterProbe::default());
    static TOKEN: Cell<Option<[u64; 4]>> = const { Cell::new(None) };
}
fn run(
    action: impl FnOnce(&mut Engine) -> std::result::Result<Code, Code>,
) -> std::result::Result<JsValue, JsValue> {
    execute_data::<RasterProofSnapshot>(|e, d| {
        let before = e.query_projection(Code::Ok);
        let code = action(e).unwrap_or_else(|c| c);
        let after = e.query_projection(code);
        // Only actual cancellation of the observed owning gesture restores its phase.
        if after.active_cancelled
            && after.interaction == 0
            && TOKEN
                .get()
                .is_some_and(|t| t[..3] == [before.owner, before.session, before.interaction])
        {
            PROBE.with(|p| p.borrow_mut().terminal(after.view, true));
            TOKEN.set(None);
        }
        PROBE.with(|p| {
            let p = p.borrow();
            d.raster.set(Result {
                epoch: p.capture.epoch,
                offset: p.capture.offset,
                enabled: p.capture.enabled,
                outcome: p.outcome,
            });
        });
        code
    })
}
#[wasm_bindgen(js_name=fixtureRasterBegin,unchecked_return_type="RasterProofSnapshot")]
pub fn begin(
    owner: u64,
    session: u64,
    mapping: u64,
    x: JsValue,
    y: JsValue,
) -> std::result::Result<JsValue, JsValue> {
    run(|e| {
        let p = e.query_projection(Code::Ok);
        let start = [number(x)?, number(y)?];
        let code = e.pan_begin(owner, session, mapping, 1, start[0], start[1], false);
        if code == Code::Ok {
            let metrics = p.metrics.ok_or(Code::Unavailable)?;
            PROBE.with(|probe| {
                probe
                    .borrow_mut()
                    .begin(owner, session, p.view, metrics, start)
            });
            TOKEN.set(Some([
                owner,
                session,
                e.query_projection(code).interaction,
                mapping,
            ]));
        }
        Ok(code)
    })
}
#[wasm_bindgen(js_name=fixtureRasterUpdate,unchecked_return_type="RasterProofSnapshot")]
pub fn update(
    owner: u64,
    session: u64,
    interaction: u64,
    mapping: u64,
    sequence: JsValue,
    x: JsValue,
    y: JsValue,
) -> std::result::Result<JsValue, JsValue> {
    run(|e| {
        let current = [number(x)?, number(y)?];
        let code = e.pan_update(
            owner,
            session,
            interaction,
            mapping,
            id(sequence)?,
            current[0],
            current[1],
            false,
        );
        if code == Code::Ok && TOKEN.get() == Some([owner, session, interaction, mapping]) {
            let view = e.query_projection(code).view;
            PROBE.with(|probe| probe.borrow_mut().update(current, view));
        }
        Ok(code)
    })
}
#[wasm_bindgen(js_name=fixtureRasterTerminal,unchecked_return_type="RasterProofSnapshot")]
pub fn terminal(
    owner: u64,
    session: u64,
    interaction: u64,
    mapping: u64,
    sequence: JsValue,
    cancel: bool,
) -> std::result::Result<JsValue, JsValue> {
    run(|e| {
        let code = if cancel {
            e.cancel(owner, session, interaction)
        } else {
            e.pan_end(owner, session, interaction, mapping, id(sequence)?)
        };
        if code == Code::Ok
            && !cancel
            && TOKEN.get() == Some([owner, session, interaction, mapping])
        {
            let view = e.query_projection(code).view;
            PROBE.with(|probe| probe.borrow_mut().terminal(view, false));
            TOKEN.set(None);
        }
        Ok(code)
    })
}
