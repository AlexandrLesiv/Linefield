# Multiplatform plan from day one

Current order (decision 231): macOS remains the primary product target; web is the first implementation platform because the owner has the most experience with web. Develop macOS next, then iPhone/iPad as the next native priority. Retain all planned apps/ hosts and review portable boundaries from day one. This sequence update does not approve unreviewed contracts, new product features or certify any platform implementation.

Visual policy (decision 232): app-owned UI uses one consistent Linefield style on every host. Mandatory native visual themes are superseded; existing toolkit choices below do not require their default styling. Adapt layout/targets/text to the device and retain native input, accessibility and OS-owned panels. The wheel is retired; desktop tools use the left rail with top contextual settings. Existing gallery visuals have not been rewritten.

| Folder | Stack and capability | Responsibility |
| --- | --- | --- |
| apps/macos | Swift + AppKit. Apple Silicon only, latest stable macOS (decision 186); editable desktop app, primary product target and first native milestone after web. | macos_ui |
| apps/ios | Swift + UIKit; SwiftUI where appropriate. iPhone and iPad editor with touch/Pencil-specific design; next native priority after macOS. | ios_ui |
| apps/android | Kotlin + Jetpack Compose; existing Material 3 component direction is subject to Linefield styling, not mandatory Material appearance. Phone/tablet editor; Android desktop behavior shared with the ChromeOS route. | android_ui |
| apps/windows | C# + WinUI 3. Desktop editor with native pen, pointer, keyboard and file integration. | windows_ui |
| apps/linux | Rust + GTK4/libadwaita. GNOME-oriented desktop editor; other Linux desktops need explicit support evidence. | Lead-assigned Linux implementer |
| apps/web | TypeScript + semantic HTML, Rust/Wasm and Skia CanvasKit. First implementation platform. Browser editor with native browser semantics; no claim of AppKit or WinUI widgets. | Lead-assigned web implementer |
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
- Persistence semantics, revision matching and recovery policy stay shared. Host adapters provide storage access/permissions and execution facilities. Native threads, filesystem paths and blocking I/O cannot be unconditional browser dependencies. Define storage/executor ports; compile/test both native and Wasm-compatible engine targets during the first web/shared foundation and again for macOS.
- editor-services contains shared policy helpers and explicitly selected native backends. Browser storage and scheduling need adapters without a parallel editor owner. No assumption that desktop workers/filesystems exist on every host.
- editor-renderer consumes renderer-independent scene/geometry. Skia remains selected. Isolate the macOS Metal backend; Windows/Android/Linux and CanvasKit use reviewed host-specific integrations. Do not expose Metal handles in a shared scene API or make Metal an unconditional dependency. Full normal Skia functionality is retained; platform isolation is not a request for a minimal Skia build.
- editor-native is the typed native ABI/composition boundary, not the sole universal host API. Swift/C# use reviewed generated declarations; Kotlin needs a separately reviewed typed JNI/binding adapter; web needs typed Wasm bindings/TypeScript declarations; Rust GTK may call Rust directly. Defer implementing these adapters until their tasks, but review representability/lifetimes now. No serialized command packet layer is introduced to make adapters look identical.
- Thread topology is host-specific. A single editor owner, bounded work, immutable snapshots, cancellation, revision checks and no blocking ink path are common invariants. AppKit main-thread ownership is the macOS proposal, not a rule forcing every OS/browser to use the same scheduler.
- Keep one portable document schema; do not create incompatible per-OS formats. Conformance fixtures cover editing semantics, ordering, cancellation, undo and file validation. File providers and recovery behavior still need host-specific evidence.
- Render the shared Linefield component design through the selected host frameworks. Liquid Glass, Material and other OS-specific appearances are not required. Shared tokens/assets/specifications and host component work provide consistency; no style migration into Rust or universal widget engine is implied. System text/IME, focus, accessibility, safe areas and OS-owned panels retain host behavior.

## Rollout and acceptance

S00–S02 include cross-platform design/contract review now. P05 is the first implementation platform and does not depend on macOS S08 acceptance. Its memory-only gallery prototype already exists; the full browser editor, Wasm boundary, storage and lifecycle need their reviewed slice plans. Shared Rust work supports both hosts. S03–S08 retain the macOS preview milestones after web; P01 targets iPhone/iPad next. The remaining P02–P12 hosts (excluding P05) follow macOS acceptance and explicit implementation direction, with scheduling based on hardware, tools and reviewed scope. S09 distribution is separate from implementation order.

Every port requires approved platform-specific design review, command/schema conformance, actual-host builds, native/browser E2E, input/focus/accessibility checks, storage/recovery failures, lifecycle/memory-pressure checks, logs and measured renderer behavior. Report planned, implemented, tested and accepted separately. No placeholders count as working support.

ChromeOS delivery reuses Android desktop and/or web implementations. Review keyboard, mouse/pen/touch, resizing, density, file access, offline operation and lifecycle on real supported devices. Android desktop integration uses adaptive Android applications. Verify actual supported devices and distribution at port implementation.

Apple TV and Watch are view-only. Watch planning preserves iPhone-first document acquisition with local cache and later authenticated network fallback when the phone is unavailable. Standalone operation must not rely on a paired phone being reachable. Define source precedence, freshness/offline errors and credential/privacy handling before implementing networking; no server/account feature is authorized by this scaffold. visionOS starts with an approved 2D interface; no implicit immersive authoring scope.

## Design coordination

ui_ux_designer coordinates common concepts and separate per-platform layouts/reviews. macos_ui, ios_ui, android_ui and windows_ui provide native feasibility. Lead explicitly assigns Linux, web and Apple viewer implementation; shared Apple files have one owner. Platform agents may review portability now; web implementation leads; other native implementations follow macOS. Existing concurrency limits remain unchanged.

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
network/auth require review. Android phone/tablet Compose remains selected (decision 211), with mandatory Material appearance superseded by decision 232. Wear-specific Compose libraries remain a separate toolkit review; phone/tablet approval does not establish watch component or capability parity.
Design small/round layouts, rotary input where available, native Back, TalkBack, reduced motion
and lifecycle/battery limits. android_ui owns engineering; combined design ownership follows design/roles.md.

Decision 152 confirms watchOS, tvOS, Wear OS and Android TV/Google TV are view-only. Input devices cannot enable drawing/content mutations; viewing and navigation designs still require approval.

Bilingual launch requirement: every host, including viewers and ChromeOS, supports en and uk when implemented. Follow native OS/per-app language selection at launch (browser preferences on web), no in-app selector. Require native resource, linguistic, layout/AX and E2E evidence for both; English fallback is not Ukrainian completeness. See internationalization.md.

## Multi-client portability

Decisions 163–164 select incremental local clients with one authoritative Rust coordinator and platform communication adapters. See architecture/incremental-collaboration.md for browser VFS/worker, mobile lifecycle and native peer constraints. View-only hosts remain viewers. Local IPC is distinct from future cross-device sync (165). No universal NSXPC/shared live cloud WAL or implicit server selected.

Selected communication defaults and store constraints: [platform IPC](architecture/platform-ipc-defaults.md), [store compatibility](distribution/ipc-compatibility.md), decision 182. Platform-specific data/thread/security evidence remains required; no new implementation is implied.
