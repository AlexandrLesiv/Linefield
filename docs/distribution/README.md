# Distribution readiness review — S00G proposal v1

Current sequence note (decision 231): development starts on web, then macOS; macOS remains
the primary product target. The dated review below retains its original research scope.
No distribution authorization follows from the implementation-order change.

Checked 2026-10-16 from official primary sources with Apple, Android and Windows specialist research.
Lead covered Linux/web/alternative channels. Documentation only: no app, package, account action,
submission, compliance certification or distribution approval. Preview remains local/macOS-first.

Start with the [channel strategy and architecture brief](channel-strategy.md), then read [Apple](apple.md), [Google Play](android.md), [Windows](windows.md) and
[Linux/web/alternatives](other-channels.md). Requirement IDs are local register IDs, not store rule IDs.
Each register row supplies applicability, source, impact and required evidence. All are currently
unverified against an artifact. Channel-conditional rows become release blockers only when selected;
already-approved sandbox/privacy/quality constraints apply to the preview independently of stores.

## What matters from day zero

1. Keep narrow native privileges and approved macOS sandbox; verify imported files, durable export
   access and multi-process authority early. Packaging must not be mistaken for a security boundary.
2. Inventory dependency/data flows and licenses. Native Rust/Skia builds remain subject to platform
   ABI, page-size, privacy-API and redistribution requirements. No-data-collected needs evidence.
3. Design native keyboard/focus/remote/AX and lifecycle behavior for actual supported form factors.
   Do not expose untested compatible-device availability or advertise viewer editing/standalone use.
4. Keep library identity/storage separate from store package identity, provider paths and future cloud.
   Choose stable package IDs with owner review before provisioning, not invented production domains.
5. Preserve build provenance, signed update identity and clean install/upgrade/recovery tests. Defer
   enrollment/signing purchases/listing submissions until the owner selects a distribution milestone.

## Channel map and ownership

| Host | Candidate routes | Technical owner / evidence | Day-zero or later blocker |
| --- | --- | --- | --- |
| macOS | Local preview; later Mac Store/direct signed notarized distribution | macos_ui + build_reliability | Sandbox now; exact channel/signing/privacy/licenses before release |
| iPhone/iPad | App Store; other regional routes require separate review if requested | ios_ui + build_reliability | Actual device/SDK/API/privacy/availability before port release |
| visionOS | Native App Store or deliberately compatible iPad app | Assigned ios_ui + lead | Native/compatible scope and input evidence |
| tvOS/watchOS | Family App Store targets | Lead-assigned Apple engineer + build_reliability | Real viewer usability; independent watch acquisition before standalone claim |
| Android/ChromeOS Android | Play; optional direct/F-Droid/other channel review | android_ui + Rust/rendering + build_reliability | Native libraries, target/device filters and form-factor evidence |
| Android/Google TV, Wear, XR | Applicable Play form-factor routes | android_ui + build_reliability | Family quality and truthful standalone/2D capability; no accidental rollout |
| Windows | Store MSIX candidate; Store EXE/MSI or direct alternatives | windows_ui + build_reliability | Actual privilege model, architecture packages, privacy and signing route |
| Linux | Flathub, Snap, distro/direct candidates | Lead assigns Linux engineer; build_reliability | Flatpak/portal feasibility; Flathub human-only packaging/submission constraints |
| Browser/ChromeOS web | HTTPS web/PWA; optional store wrapper separately reviewed | Lead assigns web engineer; build_reliability | Origin/storage/offline/update proof; no universal browser-store certification |

Native engineers implement technical requirements; Rust/rendering specialists own shared/native
libraries; build reliability owns artifact and provenance evidence. ui_ux_designer owns necessary disclosures, permission/recovery/navigation flows and their
approved design review/adaptive presentation. Lead owns
applicability and current source versions; independent reviewer checks claims and gaps. Owner chooses
license, channels, territories, legal/account/commercial matters and authorizes distribution. No new
permanent store agent is recommended or configured. Legal uncertainties are not resolved by an agent
checklist; escalate concrete issues when the actual license/channel/data model is selected.

## Review lifecycle and acceptance

Each affected implementation/release task cites register IDs, security impact/SEC IDs and input cases.
For each applicable requirement record: source revision/effective date, exact build/artifact hash,
owner, evidence link, pass/fail/not-run/not-applicable with reason, reviewer and recheck trigger.
Source checked date is not proof of implementation; upstream documentation can conflict or change.
Required missing/failed evidence blocks the affected release. Do not call optional metadata mandatory
or use a later effective policy as today's rule. Recheck at platform planning, SDK/dependency/data/
permission/device/price changes, and immediately before submission; no recurring monitor created.

A release review must cover clean install/update/uninstall, crash/migration/file recovery, device/AX/
input/performance evidence, artifact signatures and native dependencies, privacy/license inventory,
listing/ratings/support and family eligibility. Local documentation validation is not this evidence.
Future CI can report these same IDs/statuses; no gate runner is installed now.

## Issues needing later owner or concrete contract review

- Select macOS distribution route when moving beyond preview; no reason to enroll or publish now.
- Select project license, production identity and supported minimum OS/device matrix before release.
- Resolve independent watch acquisition before claiming standalone support; Wear view-only role is now selected (152).
- Confirm Windows handling of personal information against actual policy/data, without silently
  reversing the selected no-application-encryption preview scope.
- Recheck conflicting/date-sensitive SDK/page-size guidance against the actual submission route.
- If selecting Flathub, use a human-led packaging/submission process under its current AI policy;
  preserve disclosure/provenance. Alternative Linux channels remain candidates, not workarounds approved here.

Input behavior is proposed by UX per feature using the input inventory (decision 151), with owner
design approval before code; no global binding decision queue. Concrete ABI/schema/mechanisms still
need review. This review does not select the recommended channels or authorize implementation.
