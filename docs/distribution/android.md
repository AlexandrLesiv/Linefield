# Google Play / Android family — S00G research v1

Checked 2026-10-16. All rows are conditional on selecting the channel; no Android implementation,
account, submission, compliance evidence or distribution approval exists. android_ui owns host
requirements; rust_engine/rendering_performance own native integration; build_reliability owns
packaging/provenance; UX/UI own disclosures and interaction accessibility. Recheck every applicable
row after SDK/data/permission/device changes and before release.

| ID / trigger | Current sourced constraint | Required evidence / gap |
| --- | --- | --- |
| PLAY-01 new app/update targets | Current policy from 2026-08-31: mobile API 36, Wear 35, TV 34, XR 34. ChromeOS Android follows its package. Target SDK is not minimum OS. [Target policy](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en-EN) | Selected toolchain/manifest and actual console validation; pending, values are date-sensitive |
| PLAY-02 new app packaging | AAB and Play App Signing; distinguish upload versus distribution keys and preserve update identity. [Bundles](https://developer.android.com/guide/app-bundle), [signing](https://developer.android.com/studio/publish/app-signing) | Exact bundle, delivered APKs, signing/provenance and update tests; no enrollment now |
| PLAY-03 native code | Applicable 64-bit support and correct architecture packaging include Rust, Skia and transitive native libraries. [64-bit requirement](https://developer.android.com/google/play/requirements/64-bit) | Inspect delivered libraries, not only build flags; ABI/device tests pending |
| PLAY-04 16 KB pages | API 35+ page-size compatibility affects native binaries/alignment and runtime assumptions. Current guide says updates blocked 2027-02-01, differing from earlier public deadlines. [Current guide](https://developer.android.com/guide/practices/page-sizes) | Require correct ELF/APK alignment and real 16 KB runtime tests regardless; exact new-app/update policy and console applicability require release recheck; no blanket grace period asserted |
| PLAY-05 privacy | Policy in Console and in-app link/text; Data Safety also for no-collection apps, with exclusively internal-testing exception. [User Data](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en), [Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en) | App/SDK egress inventory, diagnostics review, policy/form consistency; offline claim alone insufficient |
| PLAY-06 account-dependent testing | Personal developer accounts created after 2023-11-13 currently require 12 opted-in closed testers for 14 continuous days before production-access application. [Testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en-GB) | Owner account eligibility and real test evidence; time served is not approval; no account action now |
| PLAY-07 future features | Account creation triggers deletion paths; paid digital features trigger current payment rules with regional/program conditions. [Deletion](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en), [payments](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en) | Reassess when proposed; no accounts, billing or cloud implemented by this task |
| PLAY-08 provenance | Select project license, audit native/transitive code/assets and retain required notices. Skia's license doesn't cover every dependency. [Skia license](https://skia.googlesource.com/skia/+/main/LICENSE) | Exact dependency/license manifest and source obligations; owner license decision pending |

## Form-factor eligibility is separate from shared code

| ID / family | Requirements and architecture implication | Evidence / current gap |
| --- | --- | --- |
| PLAY-09 ChromeOS | Review touchscreen/hardware filtering, ABIs, resizing and keyboard/mouse/stylus. [ChromeOS](https://developer.android.com/develop/devices/chromeos/learn) | Real Chromebook tests; web route is a separate product artifact, not Android proof |
| PLAY-10 TV/Google TV | D-pad reachability, native Back, Leanback entry, no required touchscreen, appropriate landscape layout. Current quality lists minSDK 31 or lower; static viewers cannot suppress Ambient Mode as though playing media. [TV quality](https://developer.android.com/docs/quality-guidelines/tv-app-quality), [TV distribution](https://developer.android.com/training/tv/publishing/distribute) | Remote/sleep/lifecycle tests and form-factor review; viewer UI/Figma pending |
| PLAY-11 Wear | Watch artifact/features, truthful standalone declaration, round/small-screen/rotary/AX/battery quality. [Packaging](https://developer.android.com/training/wearables/packaging), [quality](https://developer.android.com/docs/quality-guidelines/wear-app-quality) | Core functionality without phone before standalone claim. Packaging page's APK terminology needs reconciliation with new-app AAB guidance; P12 view-only role selected (152); toolkit/source not selected |
| PLAY-12 XR | Compatible mobile apps can be available as 2D through mobile track; dedicated XR track has specific feature requirements. Don't add immersion just for distribution. Headset/wired-glasses and augmented audio/display-glasses routes differ. [Distribution](https://developer.android.com/develop/xr/package-and-distribute), [quality](https://developer.android.com/docs/quality-guidelines/android-xr) | Explicit device catalog/availability review to avoid unintended rollout; real 2D device evidence pending |

Future release gate: inspect exact AAB-derived artifacts, signatures/update continuity, native
ABI/16 KB behavior, permissions/device filters, data declarations, license/notices, ratings/listing,
account eligibility and applicable family review. Local preview remains separate. Store acceptance
cannot be inferred from successful build or this register; no extra permanent Store agent is needed.
