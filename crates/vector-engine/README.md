# Shared approved vector engine — integration checkpoint

This crate owns the approved prototype's document, raw samples, brush response, editing, layers, history and geometry. It builds for Wasm and native targets without browser dependencies. The document/rendering algorithms originate from the verified complete 5207 handoff; subsequent integration changes add checked transport capacities, shared camera arithmetic and a generated ABI identity. The browser adapter and rendering implementation remain under `apps/vector-editor`.

Build Wasm with `cargo build --locked -p linefield-vector-engine --target wasm32-unknown-unknown --profile vector-editor`. The dedicated profile retains the donor's optimization level 3 and LTO instead of inheriting Linefield's size-focused release optimization. Browser ABI declarations are generated from the Rust exports by `scripts/vector-editor-boundary.ts`.

This location does not imply final architectural acceptance. The donor uses f32 raw coordinates; regional coordinates, checked argument/buffer ownership and reconciliation with the existing shared editor are pending. The older `linefield-editor-engine` is retained for existing consumers and is not a second owner of this new editor session. The native adapter is inherited reference code, not a validated complete Linefield native contract; its historical header reference is absent from the approved source package. Do not claim native integration is complete.

## Derived geometry transport ownership

`geometry_input_capacity()` and `geometry_output_capacity()` return counts of f32 values, not bytes or document capacity. `geometry_snapshot` writes a copied, bounded snapshot to engine scratch storage. The host must copy it before another snapshot call; the copy may be transferred to the worker, never the owning engine's memory. The worker validates the message before writing its own independent scratch buffer. Rust still validates snapshot structure and produces geometry. The returned output must be copied before another render call and transferred back as disposable derived data. The host checks the returned bound and outstanding request identity. Existing cache version/detail checks decide whether the output still applies. A failed transport retires that worker and uses the donor's synchronous geometry fallback; it never changes raw samples or history.

This contract covers the existing geometry worker only. It does not approve any of the five new worker experiments, add a document owner, establish complete argument validation for other exports, or resolve regional coordinates.

## Shared camera arithmetic

`camera_map`, `camera_zoom`, and `camera_rotate` accept finite f64 view coordinates and a positive zoom. They return 1 on success and 0 on invalid/overflowed results; failure leaves output unchanged. `camera_output_ptr` borrows three f64 values until the next successful camera operation on the same thread. Copy them immediately, and recreate typed views after Wasm memory growth. `camera_normalize` implements the same signed-turn normalization as the donor; its caller supplies a finite angle.

The host retains current view state, acquires local input coordinates and renders its derived GPU projections. Rust owns inverse input mapping and pointer-anchored zoom/rotation arithmetic. This is a reusable numerical boundary, not a regional-coordinate implementation: document samples still use the donor's f32 representation, which remains an explicit integration gap.

## Scalar ABI deployment identity

The boundary generator hashes the sorted Rust export signatures, including original argument and return types before mapping them to JavaScript numbers. It emits the same eight SHA-256 words into Rust and the TypeScript contract. Both main and geometry-worker loaders validate these words once after checking exports and arities. This detects a stale deployment where, for example, f32 became f64 but the JavaScript function arity stayed the same. It adds no per-sample or rendering wrapper.

This fingerprint identifies scalar signature shape only. It is not code authentication, a semantic compatibility guarantee, a saved-document version or runtime argument validation. Functions with unchanged signatures can still change semantics and require review and deployment coordination. Unknown fingerprint word indices return zero; loaders always compare exactly eight words. Generated outputs are checked during the build.

## Regional arithmetic foundation (not yet adopted by drawing)

`regional_normalize(i64 region, f64 local)` normalizes one axis into region size 65,536 and local interval `[0,65536)`. `regional_offset` requires a normalized input and adds a finite displacement, splitting its whole-region part before combining local values so a large displacement does not erase the original fractional remainder. Carry/borrow is computed in i128 and checked back into i64; overflow and nonfinite values return 0 without changing the previous result. Success returns 1. Copy `regional_result_region()` and `regional_result_local()` immediately, before another successful regional operation. All math retains ordinary f64 local rounding; it does not promise arbitrary precision.

Generated browser declarations expose signed i64 as `bigint`, never `number`. The underlying Wasm ABI still wraps out-of-range BigInts to i64: callers must enforce the signed-i64 range before constructing transport values. A checked host address type is required when these primitives are adopted; raw exports alone do not provide that validation. Native callers already supply i64. This foundation is deliberately not wired into input, canonical samples, Slice, selection or rendering, and does not fix the documented distant-drawing issue yet. Origin-relative geometry, stable paper phase, cache identity, placement and end-to-end coordinate adoption remain separate required work.
