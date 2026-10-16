# Multiplatform plan from day one

Owner correction recorded 2026-10-16: retain apps/ with all planned platform hosts now. Plan portable boundaries before macOS implementation. Implement macOS features first; other platform features follow. This authorizes documentation/placeholders, not app code or new product features.

| Folder | Stack and capability | Responsibility |
| --- | --- | --- |
| apps/macos | Swift + AppKit. Apple Silicon only, latest stable macOS (decision 186); editable desktop app, first implementation milestone. | macos_ui |
| apps/ios | Swift + UIKit; SwiftUI where appropriate. iPhone and iPad editor with touch/Pencil-specific design; second platform priority. | ios_ui |
| apps/android | Kotlin + Android Views and Material controls. Phone/tablet editor; Android desktop behavior shared with the ChromeOS route. | android_ui |
| apps/windows | C# + WinUI 3. Desktop editor with native pen, pointer, keyboard and file integration. | windows_ui |
| apps/linux | Rust + GTK4/libadwaita. GNOME-oriented desktop editor; other Linux desktops need explicit support evidence. | Lead-assigned Linux implementer |
| apps/web | TypeScript + semantic HTML, Rust/Wasm and Skia CanvasKit. Browser editor with native browser semantics; no claim of AppKit or WinUI widgets. | Lead-assigned web implementer |
| apps/visionos | Swift native visionOS UI; 2D drawing surface first. Adapted editing/viewing experience; spatial/immersive features require separate scope. | ios_ui when explicitly assigned |
| apps/tvos | Swift + native tvOS controls. View-only app; remote navigation, loading and zoom/pan without editing commands. | Lead-assigned Apple viewer implementer |
| apps/wearos | Kotlin Wear OS host; owner-selected view-only scope. Watch-native toolkit and standalone/source policy pending P12 review. | android_ui |
| apps/watchos | SwiftUI + watchOS APIs. View-only standalone-capable viewer; iPhone preferred source, network fallback planned after network service approval. | Lead-assigned Apple viewer implementer |
| apps/chromeos | Android desktop route and/or browser route. Integration/acceptance folder; reuse apps/android and apps/web, not a third editor or assumed new OS SDK. | android_ui plus assigned web implementer |

## Android TV and Google TV

apps/android-tv is a planned host; [P10](../tasks/P10.md) defines its implementation gate. View-only drawing presentation with remote/D-pad navigation, focus, loading and supported pan/zoom. Shared read-only capabilities must reject editing, not merely hide tools. Google TV is covered by this Android TV host, not a second editing engine. android_ui owns the host with designer review; no source code is present.

## Android XR

apps/android-xr is a planned host; [P11](../tasks/P11.md) defines its implementation gate. Initially a 2D drawing/viewing surface adapted from the Android host. Review editor/viewer capabilities and headset input before implementation. Immersive authoring, spatial tools and new gestures are not authorized by adding this folder. android_ui owns the host with designer review; no source code is present.

## Shared boundaries established before the first app

- editor-engine remains platform-independent Rust: document, geometry, typed commands, transaction/history, validation, document schema and scene descriptions. No AppKit, Metal, filesystem handles, platform paths or native widgets in those values. Design for native and wasm32 consumers; portability is tested when build tooling is authorized.
- Shared Rust defines tool/action IDs, capability availability and behavior; each host owns its native controls, layout, accessibility, input translation and lifecycle. A read-only viewer receives a restricted capability surface; hiding buttons alone must not grant mutation rights.
- Persistence semantics, revision matching and recovery policy stay shared. Host adapters provide storage access/permissions and execution facilities. Native threads, filesystem paths and blocking I/O cannot be unconditional browser dependencies. Define storage/executor ports; compile/test both native and Wasm-compatible engine targets during the macOS foundation.
- editor-services contains shared policy helpers and explicitly selected native backends. Browser storage and scheduling need adapters without a parallel editor owner. No assumption that desktop workers/filesystems exist on every host.
- editor-renderer consumes renderer-independent scene/geometry. Skia remains selected. Isolate the macOS Metal backend; Windows/Android/Linux and CanvasKit use reviewed host-specific integrations. Do not expose Metal handles in a shared scene API or make Metal an unconditional dependency. Full normal Skia functionality is retained; platform isolation is not a request for a minimal Skia build.
- editor-native is the typed native ABI/composition boundary, not the sole universal host API. Swift/C# use reviewed generated declarations; Kotlin needs a separately reviewed typed JNI/binding adapter; web needs typed Wasm bindings/TypeScript declarations; Rust GTK may call Rust directly. Defer implementing these adapters until their tasks, but review representability/lifetimes now. No serialized command packet layer is introduced to make adapters look identical.
- Thread topology is host-specific. A single editor owner, bounded work, immutable snapshots, cancellation, revision checks and no blocking ink path are common invariants. AppKit main-thread ownership is the macOS proposal, not a rule forcing every OS/browser to use the same scheduler.
- Keep one portable document schema; do not create incompatible per-OS formats. Conformance fixtures cover editing semantics, ordering, cancellation, undo and file validation. File providers and recovery behavior still need host-specific evidence.
- Match platform controls and appearance: AppKit/UIKit system styling (including system-provided Liquid Glass where available and appropriate), Android Views/Material, WinUI, GTK/libadwaita and semantic HTML. Do not reproduce one platform's visual style on another or hand-build glass effects without design/performance approval.

## Rollout and acceptance

S00–S02 include cross-platform design/contract review now. S03–S08 deliver the first macOS preview. P01 targets iPhone/iPad next. P02–P12 execute after macOS acceptance and explicit implementation direction; their relative scheduling depends on hardware, tools and reviewed platform scope. S09 distribution is separate from porting.

Every port requires approved platform-specific Figma, command/schema conformance, actual-host builds, native/browser E2E, input/focus/accessibility checks, storage/recovery failures, lifecycle/memory-pressure checks, logs and measured renderer behavior. Report planned, implemented, tested and accepted separately. No placeholders count as working support.

ChromeOS delivery reuses Android desktop and/or web implementations. Review keyboard, mouse/pen/touch, resizing, density, file access, offline operation and lifecycle on real supported devices. “GooglebookOS” is a requested future target label, not a verified separate SDK: validate actual product/runtime capabilities when its task begins.

Apple TV and Watch are view-only. Watch planning preserves iPhone-first document acquisition with local cache and later authenticated network fallback when the phone is unavailable. Standalone operation must not rely on a paired phone being reachable. Define source precedence, freshness/offline errors and credential/privacy handling before implementing networking; no server/account feature is authorized by this scaffold. visionOS starts with an approved 2D interface; no implicit immersive authoring scope.

## Design coordination

ux_designer and ui_designer coordinate common concepts and separate per-platform layouts/reviews. macos_ui, ios_ui, android_ui and windows_ui provide native feasibility. Lead explicitly assigns Linux, web and Apple viewer implementation; shared Apple files have one owner. Platform agents may review portability now; implementation stays sequenced after macOS. Existing concurrency limits remain unchanged.

## Internationalization boundary

All hosts follow [i18n architecture](internationalization.md): shared Rust semantics/typed errors, native resource catalogs and local parsing/formatting, platform RTL/Unicode/IME and AX verification. Android-derived TV/XR reuse semantic mappings with device-specific layouts. No global language/keyboard change or shared custom localization runtime is assumed.

## Navigation and motion per host

[Navigation](navigation.md) maps destinations to native windows/stacks or browser URLs;
[motion](design/motion.md) specifies native transitions, interruption/reduced motion and focus.
All ports review shared dirty/cancel/open semantics with their own Back/lifecycle behavior,
plus URL/deep-link safety where applicable. No universal native URL bar or router is required.

## Wear OS

Owner added apps/wearos as a target on 2026-10-16, tracked by [P12](../tasks/P12.md). View-only
is now owner-selected (decision 152); standalone/companion dependence, acquisition/cache and any later
network/auth require review. Android phone/tablet Views remains selected; Wear-specific Compose
is Google's recommendation and a separate proposed toolkit choice, not an approved migration.
Design small/round layouts, rotary input where available, native Back, TalkBack, reduced motion
and lifecycle/battery limits. android_ui owns engineering; UX/UI split follows design/roles.md.

Decision 152 confirms watchOS, tvOS, Wear OS and Android TV/Google TV are view-only. Input devices cannot enable drawing/content mutations; viewing and navigation designs still require approval.

Bilingual launch requirement: every host, including viewers and ChromeOS, supports en and uk when implemented. Follow native OS/per-app language selection at launch (browser preferences on web), no in-app selector. Require native resource, linguistic, layout/AX and E2E evidence for both; English fallback is not Ukrainian completeness. See internationalization.md.

## Multi-client portability

Decisions 163–164 select incremental local clients with one authoritative Rust coordinator and platform communication adapters. See architecture/incremental-collaboration.md for browser VFS/worker, mobile lifecycle and native peer constraints. View-only hosts remain viewers. Local IPC is distinct from future cross-device sync (165). No universal NSXPC/shared live cloud WAL or implicit server selected.

Selected communication defaults and store constraints: [platform IPC](architecture/platform-ipc-defaults.md), [store compatibility](distribution/ipc-compatibility.md), decision 182. Platform-specific data/thread/security evidence remains required; no new implementation is implied.
