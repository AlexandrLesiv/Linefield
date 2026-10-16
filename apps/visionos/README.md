# visionos

Status: documentation placeholder; no app implementation.

Technology direction: Swift native visionOS UI; 2D drawing surface first.

Scope: Adapted editing/viewing experience; spatial/immersive features require separate scope.

Owner: ios_ui when explicitly assigned. Task: P06.

Follow [root instructions](../../AGENTS.md), [platform boundaries](../../docs/platforms.md), [decisions](../../docs/decisions.md) and the task board before implementation. Figma approval precedes new native UI/tools. Reuse Rust command semantics and document schema; do not duplicate editing policy or introduce packet transports.

Each platform needs its own actual-host build, native/browser E2E, accessibility, lifecycle, failure and measured rendering evidence. A directory or another host's test result is not platform support.
