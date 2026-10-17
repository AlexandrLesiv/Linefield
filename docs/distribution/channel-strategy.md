# Store requirements: channel strategy and early design review

Research date: 2026-10-16. S00G decision brief, documentation only. The existing platform registers
contain detailed requirement IDs, sources, owners and evidence gaps. This brief adds recommended
channel priorities and architecture consequences; it does NOT record owner adoption or permission
to enroll, buy certificates, upload, publish, install packaging tooling or implement release features.
Only local macOS developer preview is already selected. All later channel choices below are proposals.

## Recommended channel sequence

| Host | Recommended intended route for owner review | Why / costs and alternatives |
| --- | --- | --- |
| macOS | Local preview first; signed/notarized direct release for first external distribution; preserve Mac App Store eligibility and evaluate its launch afterward | Direct release permits a small initial audience without Store submission. We own delivery/update/support. Store later adds discovery and managed delivery but another release/review path. Starting with Store/TestFlight instead is viable if managed testing/distribution matters more; no custom updater chosen |
| iPhone/iPad | App Store, with an authorized TestFlight milestone before public launch | Familiar distribution and testing; signing, family coverage and review remain required. Regional alternatives are not initial scope |
| visionOS | App Store for the explicitly supported 2D experience | Choose native versus compatible availability deliberately; a compatible listing is not evidence of a tested port |
| tvOS/watchOS | Appropriate App Store family targets, view-only | Remote/watch usability and actual drawing acquisition must be viable. Standalone is a separate claim from view-only |
| Android phones/tablets | Google Play first | Primary release/testing route; bundle/signing/device policy. Direct APK/F-Droid may follow a separate license/signing/update decision |
| ChromeOS | Android release through Play where supported; browser route through the web release | Two separate artifacts and acceptance profiles, not a second native engine or assumed identical input |
| Android TV/Google TV, Wear OS | Play form-factor releases, view-only | Dedicated family quality/eligibility tests; no editing or phone-independent claim inferred |
| Android XR | Applicable Play route after reviewed 2D scope and device evidence | Compatible availability and dedicated XR eligibility differ; no immersive feature added for store access |
| Windows | Microsoft Store with MSIX first | Managed delivery and package identity suit the WinUI plan. Direct MSIX or Store EXE/MSI are alternatives if a concrete requirement justifies their extra delivery/signing obligations |
| Linux | Plan sandboxed Flatpak compatibility; defer selecting Flathub versus a direct distribution route | Flathub's current AI policy materially affects this agent-built project; human packaging alone does not guarantee acceptance of generated application material. Snap/distro packages remain optional candidates, not parallel initial work |
| Web | HTTPS site, then installable PWA when actual offline/storage/update acceptance passes | Broad reach without a universal Store review. Browser support/storage evidence remains required; store wrappers are optional later work |

Recommendation, not approval: avoid launching every channel simultaneously. One verified artifact and
update path per supported host first; retain reproducible source and licensing/provenance evidence.
Open source does not automatically mean app-store free pricing, public-domain assets or unrestricted
redistribution. Select the actual license before bringing code/assets into the successor; reconcile
it with dependency obligations and intended channels before publishing. No monetization decision here.

## Current policy snapshot and implications

| Area | Checked requirement / relevant qualification | Early implication |
| --- | --- | --- |
| Apple Store SDKs | Dated requirements list Xcode 26+ with SDK 26+ for iOS/iPadOS/tvOS/visionOS/watchOS since April 28, 2026; iOS/iPadOS deployment target at least 13 since September 9. [Apple requirements](https://developer.apple.com/news/upcoming-requirements/) | Submission SDK is distinct from chosen minimum OS. Keep toolchain/deployment targets explicit, recheck for each submission |
| Apple sandbox/signing | Mac Store sandbox and direct-release notarization/signing are separate requirements. [Review guidelines](https://developer.apple.com/app-store/review/guidelines/), [notarization](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution) | Preserve already approved sandbox from preview; verify selected-file access, restarted exports and multi-process behavior early |
| Apple dependencies/privacy | Audit actual API use and applicable privacy manifests/SDK rules. [SDK requirements](https://developer.apple.com/support/third-party-SDK-requirements/), [privacy](https://developer.apple.com/app-store/app-privacy-details/) | Rust/static linkage does not excuse underlying native API/dependency audit. No-data-collected must match actual data flows |
| Android targets | New/update mobile API 36, Wear 35, TV/XR 34 under current policy. [Play target policy](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en) | Target SDK is not minimum supported OS; package/device filter choices and family tests are separate |
| Android native binaries | Applicable 64-bit and 16 KB compatibility includes transitive native libraries. Page-size guide currently identifies a February 2027 update block; exact submission applicability must be rechecked. [64-bit](https://developer.android.com/google/play/requirements/64-bit), [page sizes](https://developer.android.com/guide/practices/page-sizes) | Build and run Rust/Skia binaries on applicable configurations, inspect delivered APKs; do not infer a grace period or compatibility from flags |
| Android packaging/privacy | New Play apps use bundles/signing; data declarations/privacy policy still apply to offline apps under applicable rules. [Bundles](https://developer.android.com/guide/app-bundle), [User Data](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en) | Keep upload/signing identity and data inventory explicit; account eligibility/testing handled before release |
| Windows | Current policy is 7.19 on this date; published 7.20 becomes effective October 22. Store MSIX and EXE/MSI have different signing/distribution rules. [Policy](https://learn.microsoft.com/en-us/windows/apps/publish/store-policies), [MSIX](https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msix/app-package-requirements) | Don't mistake MSIX for AppContainer isolation or Store signing for all installer routes; verify actual privileges/native dependencies |
| Flathub | Current rules restrict AI-assisted manifests/submission interactions and require disclosure of included generated material; offline source-build and maintenance requirements also apply. [Requirements](https://docs.flathub.org/docs/for-app-authors/requirements) | Do not automate this submission or promise eligibility. Keep source provenance; channel choice needs human review of actual policy/application |

For precise conditional rules and open discrepancies use [Apple](apple.md), [Android](android.md),
[Windows](windows.md) and [other routes](other-channels.md). These are dated research, not a substitute
for review of the actual release. Territories/trader identity, privacy law, export declarations,
ratings, support contacts and commercial terms need owner-led review of actual distribution plans.
Accounts, tracking, public sharing, purchases and cloud would trigger additional requirements;
none is introduced just to satisfy a hypothetical checklist.

## Architecture consequences to carry into S02 and feature design

1. **Keep channel code outside the drawing engine.** Store APIs, receipts, update checks, permission
   panels and platform file access belong in reviewed host/services adapters. Rust keeps drawing,
   command, document and capability semantics. No generic store SDK or new service is selected.
2. **Use reviewed identities and authority.** Bundle/package/signing identity, library location,
   document identity and future cloud identity are distinct. Specify coexistence and data migration
   before dual-channel Mac/Windows installations: don't accidentally open the same SQLite files
   with two independent owner systems or make a new package appear to lose the library.
3. **Test sandbox/file access from the first foundation.** Save and resumable export must handle
   expired/revoked user grants and restart. An external path string does not itself grant access.
   OS credential/access APIs stay native; no broad entitlement or security setting bypass.
4. **Keep update and format compatibility explicit.** A store may update/reinstall an artifact;
   our selected migration/recovery policy still owns document safety. Define upgrade and older-build
   rejection/recovery behavior before external distribution. Never delete data to fix compatibility.
   This does not approve an updater, rollback protocol or shared cross-channel container.
5. **Maintain a dependency/data inventory.** Include Rust, Skia, native wrappers, assets, fonts and
   build provenance; audit crypto/API use as well as network/diagnostics. Release artifacts must
   contain no test hooks, private fixture data or unnecessary entitlements.
6. **Make capabilities and listings match.** watchOS/tvOS/Wear OS/Android TV are view-only in shared
   Rust. Test them with real navigation/input. Independent acquisition is needed before standalone
   claims; compatible platform availability must not silently expand supported products.
7. **Plan required UX within features.** Permission refusal, native panels, privacy access, errors,
   update/migration states and device controls belong in feature briefs and identified Figma where
   applicable. Follow the input inventory; do not decide global shortcuts or add settings/services
   just because another app has them.

These are constraints/recommendations for concrete review, not invented ABI, IPC, container-sharing,
cloud or thread designs. Existing owner-approved policy remains; material mechanisms need review.

## Responsibility and workflow

| Responsible role | Required output |
| --- | --- |
| Lead/integrator | Selected-versus-proposed channel register, effective policy dates, applicability and owner decision log; explicitly assign Linux/web/Apple-viewer engineering |
| macos_ui / ios_ui / android_ui / windows_ui | Platform API/permissions/capability feasibility, native negative tests and actual family acceptance; no unapproved security exceptions |
| rust_engine + rendering_performance | Shared viewer/command enforcement; native-library compatibility and measured resource behavior; dependency help, no store policy inside document model |
| build_reliability | Reproducible packages, identity/signature/license inventory, clean install/update/uninstall and exact-artifact reports; source/build restrictions per channel |
| ui_ux_designer | Disclosure/consent/refusal/recovery/navigation and input coverage, together with native adaptive visual/AX/motion presentation and identified Figma handoff |
| Independent reviewer | Check sensitive design and artifact/evidence/declarations; distinguish source research from verified compliance |
| Owner | License, channels, identity/accounts, territories/commercial decisions, material architecture/design approval and publication permission |

Use existing roles; no dedicated permanent store agent recommended. Each affected task links
APPLE/PLAY/WIN/OTHER requirement IDs and security/test IDs, records applicability, exact artifact,
pass/fail/missing evidence and reviewer. Recheck on SDK, dependency, data, permission, family or price
changes and before submission. Planned checks are not installed gates; future Node/CI reports reuse
these records. Store acceptance is external and cannot be guaranteed by tests or this plan.

## Decision timing

Now: review this direction and carry applicable constraints into architecture/design. No account or
fee decisions needed merely to continue documentation. Confirm production identity and license before
provisioning/reuse, and the first Mac public channel before implementing channel-specific packaging.
Before each platform release: select target families/minimum OS, exact channel/update strategy,
territories/account eligibility, declarations and verified artifacts. Publishing remains separately
authorized. No request here to decide every future store, price, permission or input binding now.
