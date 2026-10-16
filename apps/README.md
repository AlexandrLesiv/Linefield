# Platform applications

Linefield is planned as multiplatform from day one. Each platform has a native host; Rust owns shared document/editing behavior. macOS is implemented first, iPhone/iPad second; remaining platform features follow the macOS preview. Current authorization remains documentation/folders only.

See [platform plan](../docs/platforms.md) for capabilities, boundaries and acceptance. No application source or dependencies exist in these folders.

- [macos](macos/README.md): Swift + AppKit. Editable desktop app; first implementation milestone.
- [ios](ios/README.md): Swift + UIKit; SwiftUI where appropriate. iPhone and iPad editor with touch/Pencil-specific design; second platform priority.
- [android](android/README.md): Kotlin + Android Views and Material controls. Phone/tablet editor; Android desktop behavior shared with the ChromeOS route.
- [windows](windows/README.md): C# + WinUI 3. Desktop editor with native pen, pointer, keyboard and file integration.
- [linux](linux/README.md): Rust + GTK4/libadwaita. GNOME-oriented desktop editor; other Linux desktops need explicit support evidence.
- [web](web/README.md): TypeScript + semantic HTML, Rust/Wasm and Skia CanvasKit. Browser editor with native browser semantics; no claim of AppKit or WinUI widgets.
- [visionos](visionos/README.md): Swift native visionOS UI; 2D drawing surface first. Adapted editing/viewing experience; spatial/immersive features require separate scope.
- [tvos](tvos/README.md): Swift + native tvOS controls. View-only app; remote navigation, loading and zoom/pan without editing commands.
- [watchos](watchos/README.md): SwiftUI + watchOS APIs. View-only standalone-capable viewer; iPhone preferred source, network fallback planned after network service approval.
- [chromeos](chromeos/README.md): Android desktop route and/or browser route. Integration/acceptance folder; reuse apps/android and apps/web, not a third editor or assumed new OS SDK.

- [Android TV and Google TV](android-tv/README.md): View-only drawing presentation with remote/D-pad navigation, focus, loading and supported pan/zoom. Shared read-only capabilities must reject editing, not merely hide tools. Google TV is covered by this Android TV host, not a second editing engine.

- [Android XR](android-xr/README.md): Initially a 2D drawing/viewing surface adapted from the Android host. Review editor/viewer capabilities and headset input before implementation. Immersive authoring, spatial tools and new gestures are not authorized by adding this folder.

- [Wear OS](wearos/README.md): Kotlin watch host; view-only starting scope recommended, toolkit and source/standalone policy pending review.
