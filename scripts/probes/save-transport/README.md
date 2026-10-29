# SAVE-01 isolated browser transport checkpoint

Run from repository root with installed apps/web Playwright dependencies:

```sh
node scripts/probes/save-transport/run.ts
node scripts/probes/save-transport/summarize.ts .build-cache/save01/report.json
```

Set LINEFIELD_EVIDENCE_DIR to a fresh ignored output directory. Pass its report.json path to the summarizer. The runner defaults to .build-cache/save01; use the chosen path explicitly. If dependencies are installed in another checkout, LINEFIELD_PLAYWRIGHT_ROOT may name that checkout's apps/web/package.json; it is a runtime tool override, never a donor-source dependency. Chrome must be installed. The runner opens a temporary loopback server with isolation headers and closes it after headless browser work. It does not use or replace any editor preview.

The fixture compares transferable staging copies, copied shared staging, and direct reads from standalone shared WebAssembly.Memory. It generates1k,100k,1M40-byte regional sample records; six permutations counterbalance mode order. One consumer request is in flight; max chunk1,048,560 bytes; a frame yield separates chunks. Direct memory is rounded to64KiB pages. This is not a compiled Rust editor/Wasm allocator integration. It assumes data is already represented in the tested canonical layout. Source generation/checksums and worker startup are separately reported, outside transport timing.

Report source hashes, exact browser, hardware, DPR, isolation, raw observations and per-chunk ordered checksums. Consumer work is a checksum read, not SQL, file serialization or GPU work. Compare total preparation, chunk tails, roundtrip/worker time and total completion; frame sampling stops before final full-source validation and next-trial setup. The harness does not measure physical input latency. Memory counts are logical payload allocation bounds, excluding JS garbage collection, browser/runtime overhead, process peak and storage backend copies. Transfer can accumulate unreclaimed garbage beyond the one-live-protocol-buffer bound.

Recovery uses real workers and disposable data: valid-payload malformed descriptors, order change, failed posting, queue saturation, worker termination/restart, stale generation, startup/runtime exceptions and watchdog timeout. Original source stays retained. No old shared arena is mutated/reused. This proves bounded fixture transport recovery only; real shared lease reuse, release/commit races, durable receipts, SQL rollback, persistence, Rust ownership and OPFS retirement remain production gates.

No conclusion from this fixture permits reducing sample precision, dropping input, claiming Saved from a transport acknowledgement, deploying shared memory or clearing prior SQLite backend blockers. See docs/interfaces/shared-saving.md and tasks/SAVE-01.md.
