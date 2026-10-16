# watchos

Status: documentation placeholder; no app implementation.

Technology direction: SwiftUI + watchOS APIs.

Scope: View-only standalone-capable viewer; iPhone preferred source, network fallback planned after network service approval.

Owner: Lead-assigned Apple viewer implementer. Task: P08.

Follow [root instructions](../../AGENTS.md), [platform boundaries](../../docs/platforms.md), [decisions](../../docs/decisions.md) and the task board before implementation. Figma approval precedes new native UI/tools. Reuse Rust command semantics and document schema; do not duplicate editing policy or introduce packet transports.

Each platform needs its own actual-host build, native/browser E2E, accessibility, lifecycle, failure and measured rendering evidence. A directory or another host's test result is not platform support.

## Selected initial viewer — decision 195

Explicit Keep on Watch downloads contain bounded iPhone-rendered overview/detail images.
Prepare and transfer them ahead of use; open completed downloads with native UI without a
nearby phone. Preserve offline downloads through ordinary cache eviction; updates replace
the previous revision only after safe installation. No bundled watch Skia renderer required.
Arbitrary native vector files cannot be independently rendered by this initial viewer.
Concrete package/storage/security/Figma review and implementation remain pending. See P08.
