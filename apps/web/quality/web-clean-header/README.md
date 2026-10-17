# Clean normal header and web-first sequencing — 2026-10-17

Decision231. Normal entry omits the entire review section (picker, Reset samples, Browser simulation), without an empty controls row or keyboard stop. Explicit preview links retain review tools. macOS remains the primary product target; the active roadmap and instructions now put web first, then macOS, then iPhone/iPad as next native priority. This documentation update does not implement the Rust/Wasm editor or native applications.

Base fa38072da22015a965da145d6635e4e6da8ba8d7 plus preserved dirty worktree, exact source/document hashes in source-hashes.json. macOS27.0.1 arm64, Chrome155.0.8059.80 and headless WebKit27.2.126 browser tests passed,0failed/skipped (125Chrome,1WebKit).24 catalog/resource tests and type/lint/format/size checks passed. Production build: index-BpimB366.js46.43kB, index-GUGOXPPH.css17.52kB. git diff --check passed.

WEB-PC01–03 cover absent controls after entry/navigation/reload, first desktop keyboard target, explicit review controls and invalid-query fallback. Existing browser suite remains intact. Independent design review checked1280px/390px layout and focus; fresh reviewer ran3focusedcases and checked roadmap consistency. See review.md. Native E2E/device/screen-reader checks were not run. No merge/publish performed.
