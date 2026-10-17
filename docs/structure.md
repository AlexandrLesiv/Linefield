# Folder responsibilities

| Folder | Responsibility |
| --- | --- |
| .codex/agents | Specialist instructions; platform feasibility/design planning from day one |
| apps | All planned native/browser hosts; see apps/README.md and docs/platforms.md |
| apps/macos | Swift + AppKit; documentation placeholder |
| apps/ios | Swift + UIKit; SwiftUI where appropriate; documentation placeholder |
| apps/android | Kotlin + Jetpack Compose Material 3; documentation placeholder |
| apps/windows | C# + WinUI 3; documentation placeholder |
| apps/linux | Rust + GTK4/libadwaita; documentation placeholder |
| apps/web | TypeScript + semantic HTML, Rust/Wasm and Skia CanvasKit; documentation placeholder |
| apps/visionos | Swift native visionOS UI; 2D drawing surface first; documentation placeholder |
| apps/tvos | Swift + native tvOS controls; documentation placeholder |
| apps/watchos | SwiftUI + watchOS APIs; documentation placeholder |
| apps/chromeos | Android desktop route and/or browser route; documentation placeholder |
| apps/android-tv | Android TV and Google TV; native host documentation placeholder |
| apps/android-xr | Android XR; native host documentation placeholder |
| crates/editor-engine | Shared portable document, commands, history, codec, geometry and scene modules |
| crates/editor-services | Shared service contracts/policy helpers and isolated host backends |
| crates/editor-renderer | Shared render-facing contract and isolated Skia host backends; macOS Metal first |
| crates/editor-native | Typed native ABI generation/composition; future JNI/Wasm adapters reviewed separately |
| shared/localization | Shared message metadata/translations and generated platform resources |
| scripts | Node TypeScript checks and localization generation/validation |
| quality | Shared conformance and per-platform acceptance/evidence |
| docs | Objectives, decisions, platform plan, design approvals, contracts and evidence |
| tasks | web-first development sequence, macOS primary product target, plus documented native backlog |
| artifacts | Ignored local builds, logs, screenshots and measurement reports |

The four-crate arrangement remains a proposal. No Cargo, Swift, Node or Xcode build files exist. Platform placeholders express planned support, not implemented features. Shared Apple code is extracted only when concrete duplication and ownership justify it.
