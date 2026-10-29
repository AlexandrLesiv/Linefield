# Shared approved vector engine — integration checkpoint

This crate owns the approved prototype's document, raw samples, brush response, editing, layers, history and geometry. It builds for Wasm and native targets without browser dependencies. Rust source is unchanged from the verified complete 5207 handoff at this relocation checkpoint. The browser adapter and rendering implementation remain under `apps/vector-editor`.

Build Wasm with `cargo build --locked -p linefield-vector-engine --target wasm32-unknown-unknown --profile vector-editor`. The dedicated profile retains the donor's optimization level 3 and LTO instead of inheriting Linefield's size-focused release optimization. Browser ABI declarations are generated from the Rust exports by `scripts/vector-editor-boundary.ts`.

This location does not imply final architectural acceptance. The donor uses f32 raw coordinates; regional coordinates, checked argument/buffer ownership and reconciliation with the existing shared editor are pending. The older `linefield-editor-engine` is retained for existing consumers and is not a second owner of this new editor session. The native adapter is inherited reference code, not a validated complete Linefield native contract; its historical header reference is absent from the approved source package. Do not claim native integration is complete.

## Derived geometry transport ownership

`geometry_input_capacity()` and `geometry_output_capacity()` return counts of f32 values, not bytes or document capacity. `geometry_snapshot` writes a copied, bounded snapshot to engine scratch storage. The host must copy it before another snapshot call; the copy may be transferred to the worker, never the owning engine's memory. The worker validates the message before writing its own independent scratch buffer. Rust still validates snapshot structure and produces geometry. The returned output must be copied before another render call and transferred back as disposable derived data. The host checks the returned bound and outstanding request identity. Existing cache version/detail checks decide whether the output still applies. A failed transport retires that worker and uses the donor's synchronous geometry fallback; it never changes raw samples or history.

This contract covers the existing geometry worker only. It does not approve any of the five new worker experiments, add a document owner, establish complete argument validation for other exports, or resolve regional coordinates.
