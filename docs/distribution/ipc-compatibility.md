# Store compatibility of selected IPC defaults
Checked 2026-10-16. Architectural compatibility assessment, not approval/certification of an unbuilt package. Transport API support and store acceptance are separate. See [selected defaults](../architecture/platform-ipc-defaults.md). No store publication channel is selected merely by this review.

| Channel | Assessment | Required constraints / evidence |
| --- | --- | --- |
| Mac App Store | XPC and sandboxed helpers are viable in principle; helper packaging/consent has real restrictions | Sandbox app AND helper; self-contained signed bundle; public Service Management; legitimate scoped App Group entitlements; no root; no automatic login/startup or post-quit execution without consent; updates through Store |
| Apple mobile/TV/watch/visionOS App Stores | Same-process native/Rust design fits normal app model | No imported macOS LaunchAgent; extensions only through permitted extension mechanisms; public APIs, lifecycle and legitimate background modes; viewers remain read-only |
| Microsoft Store / WinUI desktop | Local named pipes are supported for Windows App SDK desktop apps | Correct MSIX/local namespace and trust model, restrictive local ACL/peer checks; package signing and capability declarations must match shipped behavior; UWP/AppContainer restrictions differ |
| Google Play / Android-family stores | JNI within process and bound Binder/AIDL services are supported platform mechanisms | Keep own-app services non-exported, use explicit binding, protect approved external exposure; respect process/background restrictions. Adding a foreground service requires valid purpose/type and relevant Play declarations, not a workaround to keep IPC alive |
| Linux/Flatpak | Session D-Bus is a platform mechanism, but sandbox permissions still apply | Narrow owned bus names and allowed access; file portals; review actual packaging/channel requirements when distribution selected |
| Browser/PWA | Web platform constraints rather than native IPC store entitlements | Same-origin/partition scope, security context/API capability, CSP/storage lifecycle. Store wrappers/extensions have separate review requirements |

## macOS finding and selected restrictions
Apple App Review 2.4.5 requires appropriate sandboxing, self-contained packaging, consent for startup/login or continued processes after quit, and no privilege escalation. The broker must be bundled, sandboxed, per-user and demand-driven. No custom installer, private bootstrap API, broad temporary sandbox exceptions or manual installation in shared locations. Approval/disablement handling and any consent screen belong in the identified design.

Apple DTS explicitly documents sandboxed app + sandboxed LaunchAgent as supported with SMAppService; sandboxed app + unsandboxed job is unsupported. This makes the helper approach technically plausible for Mac App Store packaging, not automatically accepted by App Review. Prove the exact signed/App Group/registration configuration and document the helper purpose in review notes. If store-compatible registration cannot be demonstrated, stop and revise the adapter; do not ship a bypass.

Sources: [Review Guidelines 2.4.5](https://developer.apple.com/app-store/review/guidelines/), [Apple DTS SMAppService setup](https://developer.apple.com/forums/thread/802443), [SMAppService](https://developer.apple.com/documentation/servicemanagement/smappservice).

## Windows and Android caveats
Windows App SDK desktop processes are full trust; that does not mean administrator privilege or immunity from security checks. Named pipe restrictions depend on packaged/full-trust/AppContainer context. Follow the chosen MSIX desktop profile and local-session naming; reject remote clients and do not treat JSON-RPC as authentication. [Windows IPC guidance](https://learn.microsoft.com/en-us/windows/apps/develop/communication/interprocess-communication).

Microsoft's public policy page currently labels version 7.20 as effective October 22, 2026, later than this review date. Do not describe that future revision as already in force. Recheck the applicable policy/version and capability requirements at release. [Policy page](https://learn.microsoft.com/en-us/windows/apps/publish/store-policies).

Google recommends Binder/Messenger for RPC-style communication; AIDL supplies generated typed Binder interfaces. There is no evidence of a categorical Play ban on using these documented platform APIs, but exported components and background execution create obligations. We select an own-app bound service only when necessary, not a perpetual foreground service. [Android security guidance](https://developer.android.com/privacy-and-security/security-tips), [bound services](https://developer.android.com/develop/background-work/services/bound-services), [Play foreground-service requirements](https://support.google.com/googleplay/android-developer/answer/13392821).

## Responsibility and release gates
macos_ui/ios_ui/windows_ui/android_ui own platform API, packaging/permissions/lifecycle evidence; lead assigns Linux/web. build_reliability owns exact signed/package/tool/version reports. UX/UI own any consent, disabled-helper and failure flows, with owner design review approval. Fresh reviewer checks security and actual shipped behavior. No separate store agent added.

Recheck at adapter/entitlement/background changes and before distribution. Require exact-build wrong-peer tests, registration/disable/uninstall behavior where applicable, privacy/logging audit and store-specific package validation. A successful IPC probe is not store approval. The previous initial standalone native probe is not a signed store-like independent-app/helper test.
