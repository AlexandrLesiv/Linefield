# android

Status: documentation placeholder; no app implementation.

Technology direction: Kotlin + Jetpack Compose Material 3.

Scope: Phone/tablet editor; Android desktop behavior shared with the ChromeOS route.

Owner: android_ui. Task: P02.

Follow [root instructions](../../AGENTS.md), [platform boundaries](../../docs/platforms.md), [decisions](../../docs/decisions.md) and the task board before implementation. Figma approval precedes new native UI/tools. Reuse Rust command semantics and document schema; do not duplicate editing policy or introduce packet transports.

Each platform needs its own actual-host build, native/browser E2E, accessibility, lifecycle, failure and measured rendering evidence. A directory or another host's test result is not platform support.
