# Approved editor integration checkpoint

Adapted from the verified77-file handoff, source-set474873d88d00f498105fc2fbb8eed754cc01ba93f6a3f9bcde7dfd78a853ca1d. This preserves the complete approved renderer; the Rust engine now lives in crates/vector-engine. Hosting adapts the Wasm URL and validates generated ABI exports once at startup; the rendering algorithms remain unchanged. Rebuild from source with scripts/build-vector-editor.ts.

The persistent embedded document is temporary isolation during integration, not final architecture acceptance. Regional coordinate precision, generated checked interfaces, localized Linefield controls and shipping diagnostic restrictions remain pending. No worker experiment has been adopted or measured.
