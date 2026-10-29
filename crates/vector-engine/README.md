# Shared approved vector engine — integration checkpoint

This crate owns the approved prototype's document, raw samples, brush response, editing, layers, history and geometry. It builds for Wasm and native targets without browser dependencies. Rust source is unchanged from the verified complete 5207 handoff at this relocation checkpoint. The browser adapter and rendering implementation remain under `apps/vector-editor`.

Build Wasm with `cargo build --locked -p linefield-vector-engine --target wasm32-unknown-unknown --profile vector-editor`. The dedicated profile retains the donor's optimization level 3 and LTO instead of inheriting Linefield's size-focused release optimization. Browser ABI declarations are generated from the Rust exports by `scripts/vector-editor-boundary.ts`.

This location does not imply final architectural acceptance. The donor uses f32 raw coordinates; regional coordinates, checked argument/buffer ownership and reconciliation with the existing shared editor are pending. The older `linefield-editor-engine` is retained for existing consumers and is not a second owner of this new editor session. The native adapter is inherited reference code, not a validated complete Linefield native contract; its historical header reference is absent from the approved source package. Do not claim native integration is complete.
