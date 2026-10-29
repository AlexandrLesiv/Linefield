# Shared approved vector engine — integration checkpoint

This crate owns the approved prototype's document, raw samples, brush response, editing, layers, history and geometry. It builds for Wasm and native targets without browser dependencies. The document/rendering algorithms originate from the verified complete 5207 handoff; subsequent integration changes add checked transport capacities, shared camera arithmetic and a generated ABI identity. The browser adapter and rendering implementation remain under `apps/vector-editor`.

Build Wasm with `cargo build --locked -p linefield-vector-engine --target wasm32-unknown-unknown --profile vector-editor`. The dedicated profile retains the donor's optimization level 3 and LTO instead of inheriting Linefield's size-focused release optimization. Browser ABI declarations are generated from the Rust exports by `scripts/vector-editor-boundary.ts`.

This location does not imply final architectural acceptance. Canonical raw coordinates now use signed-i64 regions and f64 local components. Regional camera/placement/query and rendering adoption, complete argument/buffer ownership and reconciliation with the existing shared editor remain pending. The older `linefield-editor-engine` is retained for existing consumers and is not a second owner of this new editor session. The native adapter is inherited reference code, not a validated complete Linefield native contract; its historical header reference is absent from the approved source package. Do not claim native integration is complete.

## Derived geometry transport ownership

`geometry_input_capacity()` and `geometry_output_capacity()` return counts of f32 values, not bytes or document capacity. `geometry_snapshot` writes a copied, bounded snapshot to engine scratch storage. The host must copy it before another snapshot call; the copy may be transferred to the worker, never the owning engine's memory. The worker validates the message before writing its own independent scratch buffer. Rust still validates snapshot structure and produces geometry. The returned output must be copied before another render call and transferred back as disposable derived data. The host checks the returned bound and outstanding request identity. Existing cache version/detail checks decide whether the output still applies. A failed transport retires that worker and uses the donor's synchronous geometry fallback; it never changes raw samples or history.

This contract covers the existing geometry worker only. It does not approve any of the five new worker experiments, add a document owner, establish complete argument validation for other exports, or resolve regional coordinates.

## Shared camera arithmetic

`camera_map`, `camera_zoom`, and `camera_rotate` accept finite f64 view coordinates and a positive zoom. They return 1 on success and 0 on invalid/overflowed results; failure leaves output unchanged. `camera_output_ptr` borrows three f64 values until the next successful camera operation on the same thread. Copy them immediately, and recreate typed views after Wasm memory growth. `camera_normalize` implements the same signed-turn normalization as the donor; its caller supplies a finite angle.

The host retains current view state, acquires local input coordinates and renders its derived GPU projections. Rust owns inverse input mapping and pointer-anchored zoom/rotation arithmetic. This is a reusable numerical boundary, not a regional-coordinate implementation: screen mapping still uses a flat f64 view. The owning sample store is regional, but camera and rendering integration remain incomplete.

## Scalar ABI deployment identity

The boundary generator hashes the sorted Rust export signatures, including original argument and return types before mapping them to JavaScript numbers. It emits the same eight SHA-256 words into Rust and the TypeScript contract. Both main and geometry-worker loaders validate these words once after checking exports and arities. This detects a stale deployment where, for example, f32 became f64 but the JavaScript function arity stayed the same. It adds no per-sample or rendering wrapper.

This fingerprint identifies scalar signature shape only. It is not code authentication, a semantic compatibility guarantee, a saved-document version or runtime argument validation. Functions with unchanged signatures can still change semantics and require review and deployment coordination. Unknown fingerprint word indices return zero; loaders always compare exactly eight words. Generated outputs are checked during the build.

## Regional arithmetic and canonical samples (render adoption pending)

`regional_normalize(i64 region, f64 local)` normalizes one axis into region size 65,536 and local interval `[0,65536)`. `regional_offset` requires a normalized input and adds a finite displacement, splitting its whole-region part before combining local values so a large displacement does not erase the original fractional remainder. Carry/borrow is computed in i128 and checked back into i64; overflow and nonfinite values return 0 without changing the previous result. Success returns 1. Copy `regional_result_region()` and `regional_result_local()` immediately, before another successful regional operation. All math retains ordinary f64 local rounding; it does not promise arbitrary precision.

Generated browser declarations expose signed i64 as `bigint`, never `number`. The underlying Wasm ABI still wraps out-of-range BigInts to i64: the browser regional-address adapter therefore rejects out-of-range regions and nonfinite transport values before calling Wasm. It immediately copies and freezes the two-part result. Raw exports alone do not provide that validation; future input/document adoption must use the adapter. Native callers already supply i64. The owning sample store now uses regional addresses, with browser input entering through transitional f64 push_precise and explicit full-range input through push_regional/the checked adapter. Slice fragments retain shared immutable sample blocks. Rendering, placement and camera still use compatibility projections, so the distant visual issue is not fixed yet. Origin-relative geometry, stable paper phase, cache identity, placement and end-to-end coordinate adoption remain separate required work.

## Default layer names and localization

Rust records whether a layer still has its generated default name. `layer_name_is_default(id)` exposes this metadata; the host formats the default label in the selected locale and displays user-authored UTF-8 names verbatim. Explicit renames clear the marker, including a user name that happens to equal the English default. The marker participates in the existing layer history snapshot, so Undo/Redo restores both identity and label. Closing an unchanged rename input never issues a rename command. This changes presentation metadata only, not stroke samples, layer blending or render ordering.


`raw_region` and `raw_local` expose canonical coordinates; `raw_length` validates indices. `raw_point` remains a legacy f32 inspection/render projection, not a canonical-coordinate API. Raw pressure retains the approved f32 representation. `canonical_sample_bytes()` reports 40 bytes per stored sample on the checked targets versus the donor's 12, before block capacity and allocator/page overhead. There is one owning sample representation, not a second shadow document. Geometry worker snapshots remain disposable f32 data in the existing bounded transport. Future origin-relative geometry must remove the lossy legacy projection without changing the renderer's scheduling/blending/cache behavior.

## Source-relative geometry

A source anchor is selected once at the first accepted point and retained through Slice fragments. `source_point`, chunk geometry and worker snapshots subtract that anchor in Rust before f32 narrowing. The zero anchor is retained for the original near-origin reference range. Existing transform output includes the source placement, so hosts must continue applying it exactly once. This does not provide final regional GPU projection: world-space transformed capsule uploads, flat placement/view interfaces and very long source spans remain integration gaps. Source anchor changes never rewrite canonical samples or add a history command.

Placement stores a finite displacement from the source anchor. Translation/history do not flatten the anchor; regional overflow rejects a whole move group before mutation. `stroke_placement_region`/`stroke_placement_local` expose normalized placement. Existing transform/offset accessors remain compatibility projections for the current host. Rotation/resize pivots and Slice queries still use the transitional flat coordinate boundary.
