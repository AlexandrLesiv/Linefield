# chromeos

Status: documentation placeholder; no app implementation.

Technology direction: Android desktop route and/or browser route.

Scope: Integration/acceptance folder; reuse apps/android and apps/web, not a third editor or assumed new OS SDK.

Owner: android_ui plus assigned web implementer. Task: P09.

Follow [root instructions](../../AGENTS.md), [platform boundaries](../../docs/platforms.md), [decisions](../../docs/decisions.md) and the task board before implementation. Figma approval precedes new native UI/tools. Reuse Rust command semantics and document schema; do not duplicate editing policy or introduce packet transports.

Each platform needs its own actual-host build, native/browser E2E, accessibility, lifecycle, failure and measured rendering evidence. A directory or another host's test result is not platform support.
