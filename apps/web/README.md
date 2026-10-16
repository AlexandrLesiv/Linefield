# web

Status: documentation placeholder; no app implementation.

Technology direction: TypeScript + semantic HTML, Rust/Wasm and Skia CanvasKit.

Scope: Browser editor with native browser semantics; no claim of AppKit or WinUI widgets.

Owner: Lead-assigned web implementer. Task: P05.

Follow [root instructions](../../AGENTS.md), [platform boundaries](../../docs/platforms.md), [decisions](../../docs/decisions.md) and the task board before implementation. Figma approval precedes new native UI/tools. Reuse Rust command semantics and document schema; do not duplicate editing policy or introduce packet transports.

Each platform needs its own actual-host build, native/browser E2E, accessibility, lifecycle, failure and measured rendering evidence. A directory or another host's test result is not platform support.
