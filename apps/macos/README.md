# macos

Status: documentation placeholder; no app implementation.

Technology direction: Swift + AppKit.

Hardware/OS policy (decision 186): Apple Silicon only; target the latest stable macOS for
the first preview. No Intel or older-macOS compatibility requirement. Pin exact stable OS,
deployment target and compatible verified toolchain when implementation begins; beta OS
versions are not required and future updates do not silently move a pinned baseline.

Scope: Editable desktop app; primary product target and first native milestone after web.

Owner: macos_ui. Task: S00–S08.

Follow [root instructions](../../AGENTS.md), [platform boundaries](../../docs/platforms.md), [decisions](../../docs/decisions.md) and the task board before implementation. design review approval precedes new native UI/tools. Reuse Rust command semantics and document schema; do not duplicate editing policy or introduce packet transports.

Each platform needs its own actual-host build, native/browser E2E, accessibility, lifecycle, failure and measured rendering evidence. A directory or another host's test result is not platform support.
