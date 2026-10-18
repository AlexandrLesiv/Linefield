# Concepts study — independent research review

Date: 2026-10-18. Reviewer: proposal_review, independently assigned by lead.
Base: `fbcc30ca115d630d6c9e688b1525d3ee1dcc89d7` plus the uncommitted research packet.
Type: research/report evidence and privacy review, not product implementation acceptance.
The reviewer did not author the observations, official-source packet, adaptation or HTML report.
Only this review file is reviewer-owned; other work remains preserved.

## Scope and method

Read the observation ledger, official-source packet and designer adaptation; compared sampled
local screenshots with their claims and inspected capture metadata. Independently reopened the
official Workspace, Brushes and Tools, Pencil Pro, Library and Export sources. Reviewed the
report generator, stylesheet, script and all four generated HTML pages. This is a static/source
assessment; actual browser layout, print and keyboard QA remain with the lead.

Relevant policy: docs/research/README.md, docs/quality.md edge-case review, design roles,
contracts, navigation/motion, internationalization and security/development-workflow.md.
The study is authorized research. It does not authorize new tools, product screens, a native
implementation, storage/ABI changes, publication or merging. Gallery preservation remains required.

## Findings and repair history

| ID | Severity | Location, trigger and impact | Required correction / disposition |
| --- | --- | --- | --- |
| CSR-01 | P2 | Adaptation evidence-gaps tail still said only OBS001–013 integrated and build unknown, despite a v1.2 header and identified About capture. A reader could discard known evidence or mistake stale summary for current scope. | Resolved and independently re-read: header and tail now agree on OBS001–020 and Concepts 6.36.1 (5415); tier remains unknown. |
| CSR-02 | P2 | Adaptation visual baseline described approximately 50% alpha “in this visual study,” despite no pixel/alpha measurement. This can convert an owner preference into a competitor fact. | Resolved and independently re-read: baseline explicitly identifies 50% as owner-requested Linefield exploration, never measured Concepts alpha. |
| CSR-03 | P3 | Blank line after OBS013 interrupts the Markdown table. Later rows may render as prose or a header instead of comparable evidence. | Resolved: the ledger and generated HTML now keep all twenty observation rows in one table. |
| CSR-04 | P2 | assets/01-gallery.png includes pre-existing private handwriting and artwork. It was initially untracked and not ignored; adding the research directory could unintentionally version or later publish it. | Resolved for local handoff: nested assets ignore confirmed; no generated href/src links to retained 01-gallery.jpg. Independent HTTP checks return 404 for ordinary and encoded private filenames, while a permitted study image returns 200. No deletion/redaction by reviewer. |
| CSR-05 | P2 | Initial build.ts converts sibling Markdown links to absolute /Users/... hrefs before its generated-page mapping. Under HTTP these are broken origin-relative paths and disclose local filesystem structure. | Resolved: URL-identity mapping links the four generated pages. Other repository references are plain labels; all generated local href/src targets exist, and no absolute filesystem href remains. |
| CSR-06 | P3 | Captures named .png are actually JPEG/JFIF; heights vary between 1700 and 1702. strip-motion.json has one untimestamped before-frame and twelve timestamped frames. Universal PNG/dimensions/timestamp wording overstates metadata. | Resolved: files/JSON renamed consistently to .jpg; ledger and main Markdown/generated HTML now state actual dimensions and capture metadata. |
| CSR-07 | P3 | A later owner-enabled Developer Mode timing investigation means unqualified “Developer Mode remained off” in adaptation can be mistaken for current device state. | Resolved: ledger, main report, adaptation and generated HTML distinguish the initial Mirroring session from later owner-enabled USB work. Later motion measurements require separate assessment. |

No content-action reconstruction was inferred solely from screenshots: Undo, input acquisition
and preservation claims remain lead-reported observations. Screenshots corroborate visible state.
The About image independently corroborates the app version/build, not OS/device provenance.

## Evidence boundaries and security assessment

Persistent Tool Wheel, documented squeeze invocation and Apple's PencilKit contextual picker
are correctly separated. The iPhone/Mirroring session cannot establish Pencil, direct touch,
multitouch, pressure, native Mac, VoiceOver or physical latency behavior. Captured intermediate
states and host timestamps cannot establish intrinsic animation duration, easing or frame rate.
Account tier, lifecycle/failure behavior, numeric rejection and actual publication remain gaps.

The proposed host controls/shared canvas split preserves Rust semantic authority. Additional
tools, opacity/smoothing, selected-stroke restyling and property transactions remain proposals
requiring the recorded scope/design/contracts gates. CAD scenarios are planned, not discovered
or passed tests; native en/uk resources, proficient Ukrainian review and design review remain separate.

The prose introduces no product authority boundary. The local report adds executable rendering
and private capture handling: its trust scope must remain reviewed local authored input, with
no remote script/upload, generic imported-Markdown execution or accidental capture publication.
Relevant privacy/evidence mappings: SEC-09/12/13, CT-07/08/09, INV-09/11. New application/network/
FFI/storage behavior would require a new threat delta and independent assessment.

## Checks reproduced

- All four generated pages: existing local href/src targets, valid local anchors, unique IDs,
  no file/absolute filesystem links, no remote image/script/style dependencies and no reference
  linking or displaying the private gallery image. Index contains twenty illustrative images.
- Capture metadata: 56 JPEG files; 54 at 774×1700 and two at 774×1702. Both sequence JSON files
  reference existing images. Ten color and twelve property timestamps increase strictly; the
  additional property before-frame has no timestamp. This is integrity, not timing acceptance.
- Node v24.12.0; strict TypeScript/noEmit on build.ts and strict checkJs/noEmit on report.js;
  Oxlint deny-warnings and Oxfmt check passed. Source lengths are 164/200/30 physical lines
  for build.ts/report.css/report.js. Root pnpm check alone does not cover these report files.
- git diff --check passed for tracked changes; no application source changed by reviewer.

The generator intentionally permits raw HTML in reviewed local author Markdown. It is not a
sanitizer or an authorized importer for external/untrusted documents. The current runtime script
only controls report navigation indication. The optional print button was removed after the
lead could not observe a print dialog; neither browser print nor PDF acceptance is claimed.

## Disposition

CSR-01–10 are resolved and independently re-reviewed. The research packet, including the USB
motion appendix, is accepted as a bounded local research handoff with the limitations below.
No blocking research-report finding remains. Browser QA is lead/designer-reported, not
independently reproduced by this reviewer. Changes after each snapshot require focused re-review;
the initial and repair hashes preserve earlier assessment history. The final motion snapshot
identifies the subsequently reviewed evidence.
No application tests, native foreground checks or device control were performed. Existing
gallery test history was not rerun and cannot serve as new drawing-screen acceptance.
No security guarantee, owner approval, merge or publication authorization is granted.

## Reviewed snapshot SHA-256

Research-directory entries below are relative to docs/research/concepts-2026-10-18/.

| Artifact | SHA-256 |
| --- | --- |
| report.md | 7bff6fc4277c1c58a7ce78128d1502612ea86fe5bad845383e9cba435e5f7682 |
| observations.md | 82f3ddaa5d97855954d1a5d733a460e7ce8eb089871d1df6b4fbf2a689b17a67 |
| ../concepts-official-sources-2026-10-18.md | 8d3c740c98d5a5d7c7a7183ee6d2dbd3a70d6c05b291d73b66015f98bb075a1c |
| ../../design/concepts-study-linefield-adaptation-2026-10-18.md | d85bee420909557617c947056a7d61971fb6e782459c4059aebb0d1fd3d12439 |
| index.html | df5357827343e49124b137913fc0418466adfc08561c6d488c739f18e9faeec5 |
| observations.html | 672e1f429710ee23f6439edbfdede05e63d41c0b11c4f0849961ac7b5db1d923 |
| sources.html | a23d136c48765d3cd59b338e313442c99ca2d753bbf75c73db78a345619d2917 |
| adaptation.html | b2561248e2d785ee045d468c72dc236f811e6cabc876d6d7ed9e4e75b171e0e4 |
| build.ts | 7bc49346d2848d275808c9baf9fa25b92270ab4e3279fc76b2972892c8576f59 |
| report.css | bf46a56698a534cc1154c86cf44bc9bc723c736fec47ceda5ac5f45e0ecc22e5 |
| report.js | c5f3a53835ecbda16ace8b2b71b10fe172089b5ef4589eaedf2c3ca9221aaa78 |

## Repair re-review and infrastructure checks

On 2026-10-18, re-read corrected Markdown and generated pages; current metadata matches the
initial capture inventory. The main report now distinguishes the completed Mirroring session
from the separately authorized later USB session. No physical timing claim was accepted here.

Read-only HTTP checks against http://127.0.0.1:65143 independently returned:

| Request | Result |
| --- | --- |
| / | 200 text/html |
| /assets/04-width-open.jpg | 200 image/jpeg |
| /assets/01-gallery.jpg | 404 |
| /assets/%30%31-gallery.jpg | 404 |
| /../AGENTS.md and /%2e%2e/AGENTS.md | 404; client URL normalization applies |
| /build.ts | 404 |

Initial sandbox request was blocked with EPERM; the authorized read-only escalation completed.
No device UI or foreground automation was used. These sampled route outcomes do not constitute
a general server penetration test, permission change or publication authorization.

Repeated strict TypeScript/checkJs, Oxlint and Oxfmt checks passed after the report infrastructure
changes. Physical source lengths: build.ts 170, report.js 24, report.css 177, report-media.css 56.
The optional fifth page is conditional on motion-analysis.md existing, not a motion evidence pass.
Media CSS adds a single-column figure layout below 680px and explicit detail-crop/full-image
behavior; raw captures remain intact. The lead reports narrow 588px QA and designer reports
1265px desktop review; those visual results are reported rather than independently reproduced.

Repair snapshot hashes, using the same research-directory-relative notation:

| Artifact | SHA-256 |
| --- | --- |
| report.md | 565129d3791d24fe19fc3a4a7cbbf34dbfb84a137e3b24f559a63c36a42c105b |
| index.html | a4099ebadfa6f63530d12c1b2df2b9699bee109ec7985d20f11ff8eda5af3cb8 |
| build.ts | 76a085c28181909d9cbee84ab33eecc7e7e40cf8c1260facc9b6bd311eb5eb9b |
| report.js | a4916c9bc55cefd4c4609177524c2cfb8a814e20a75313db9229cd2628d3ecca |
| report.css | 84707f1003ec0f9ffc810775dd917c5eddba18cc995f12260787b64626705049 |
| report-media.css | 24e2d10174ce305e61938b339ced01b6087550d7c1a2e4732c84bb3c05aec76f |
| ../../design/concepts-study-linefield-adaptation-2026-10-18.md | 74b99c66428d96947b558a7d3b2e3bd0859f9b21742f1e623306d457680999eb |
| adaptation.html | 50827a22e2136bc1c56f3cb2eab74b455e5ee84c09b49b726abadf3e03243416 |

## USB motion appendix independent review

Scope: motion-analysis.md, both analysis helpers, retained comparison/summary JSON, action logs,
five excerpts, three contact sheets, OBS021–023, the integrated main-report section and five HTML
pages. Original-movie SHA-256 values were independently recomputed and match the appendix and
analysis JSON. All 54 spans, sampling brackets and largest local gaps were independently
recalculated from retained frame comparison values and PTS; no arithmetic mismatch was found.
The original full movies were not independently decoded again. Frame classification provenance
therefore combines helper source review, hashes, retained values and sampled visual corroboration.

| ID | Severity | Trigger / impact | Correction and re-review |
| --- | --- | --- | --- |
| CSR-08 | P3 | Main summary claimed three trials universally, despite six smoothing closes. This obscures sample sizes. | Resolved: universal header removed; prose explicitly records three per operation except six smoothing closes. Unique M1/M2 event IDs disambiguate repeated close labels; width-open in the retarget sequence is distinguished from true retargeting. |
| CSR-09 | P2 | Main report described a “visually settled” endpoint despite an operational downscaled grayscale threshold, which could overstate perceptual validity. | Resolved: first changed frame to threshold-settled state, with explicit absence of validated perceptual judgment. Main table agrees with appendix rounding, including RGB 700–734 ms. |
| CSR-10 | P2 | Preset method attributed strict-threshold tails to codec/noise without proving that cause. A relaxed endpoint could suppress a real residual visual change. | Resolved: residual changes up to 600 ms are retained; codec/noise is a possible cause only. Immediate-update interpretation is explicitly threshold-dependent, with both criteria disclosed. |

Independent sensitivity calculation reproduces stricter preset spans of approximately 167, 250,
283, 333, 570 and 600 ms in six affected trials. The published relaxed criterion yields 0–19.8 ms.
This is descriptive threshold sensitivity, not justification for weakening a product performance
gate. Removing the helper's manually selected anchor lower bound from endpoint search produced
the same endpoints in all current trials; it did not conceal an earlier qualifying endpoint here.

Both PTS arrays are strictly ordered. Recomputed frame counts are 9,128 and 11,864; median gaps
16.667 ms; maximum gaps 69.333 and 83.566 ms; gaps above 25 ms number 109 and 73. Source hashes:

- Movie 1: `7a92c351173bd5706dad76dbd25fd63d7da217d3788e6c78f513db4452b26163`.
- Movie 2: `e8b86d431bbc4292dfca5c5ff1185a18fd7302892e358185f2702f1041f460d0`.

Sampled contact sheets corroborate the extended strip body before hub-feedback settling, staged
RGB arcs/background fade, and initial/final RGB values 246/93/87 and 246/91/85. They do not establish
the cause or persisted color. Interrupted/insufficiently held RGB/HSL changes have no completed
duration claim. No squeeze or completed wheel-collapse timing was inferred. Decoded endpoint
precision does not establish physical-display refresh, input latency or internal animation constants.

The shortest remaining window after a qualifying endpoint is only 66.7 ms in movie 1 and 566.7 ms
in movie 2. Combined with uncontrolled conditions, small repeats and adaptive endpoint criteria,
this limits the evidence to the explicitly described windows. It is not a sustained stability,
frame-budget, performance distribution, native accessibility or reduced-motion acceptance test.
The movie audio silence-floor result remains author-reported; independent FFprobe inspection
confirmed all five report excerpts contain H.264 video and no audio stream.

The planned MOTION-RESEARCH-01–06 labels remain research organization, not discovered/passed
Linefield tests. CT-06/SU-14/SU-16 and INV-08/11 are future implementation traceability only. No
new property, color semantic, native input, storage or rendering contract is approved by this review.

## Final infrastructure checks and limitations

- All five generated pages have existing local href/src/poster targets and local anchors, no
  filesystem URLs, no linked/displayed private gallery and no remote media dependencies.
- Independent actual HTTP: motion.html and permitted MP4 return 200; `bytes=0-63` returns
  206 with exactly 64 bytes and correct Content-Range; an out-of-bounds range returns 416.
  Plain and encoded private gallery names, original MOV, action JSON and analysis TS return 404.
  The loopback server dynamically serves reviewed report references. These sampled checks do
  not authorize serving raw assets, publishing the report or importing untrusted Markdown.
- Explicit strict TypeScript/noEmit, Oxlint deny-warnings and Oxfmt checks passed for the three
  TypeScript helpers and report presentation files as applicable. Initial standalone tsc invocations
  lacked `--ignoreConfig` and `--types node`; corrected invocation passed without source changes.
  Physical source lines: build 170, analysis 149, summary 92, CSS 177/56 and JavaScript 24.
- Lead reports 588px in-app-browser motion navigation, contact sheets and video playback from
  0:00 to 0:05 with no error; designer reports 1265px desktop review. Those are reported host
  observations, not reviewer-performed browser/keyboard/assistive-technology checks.

The analysis helpers are fixed-dataset research tools, not a general media importer, robust
benchmark runner or installed CI gate. They use local trusted logs and an external temporary
FFmpeg extraction. No reusable input/network/security API is approved. Private assets remain
ignored and local; no report publication or native foreground automation was performed here.

Final assessment: suitable for the owner's research/design discussion with these evidence limits.
Implementation still needs the recorded scope/contracts/design approval and fresh implementation
review. Existing gallery and transitions were not changed or accepted anew by this research review.

## Final motion snapshot SHA-256

Research-directory-relative paths; local asset hashes identify retained evidence without
authorizing its versioning or publication. Original movie hashes are recorded above.

| Artifact | SHA-256 |
| --- | --- |
| report.md | 43c7cc082cbeeb2b4c48efe2d0688b2982c09e6897f632e3d7877ca20b20a720 |
| observations.md | 44749cf1916b414fcd9830fd0691bca6d95c0a605fd786d1a46e4fdeb7e3acd9 |
| motion-analysis.md | ce15f0e09468f46d9006f1efc64377f6eb27cc00603eecaad8c6632dbdcd79fa |
| ../concepts-official-sources-2026-10-18.md | 8d3c740c98d5a5d7c7a7183ee6d2dbd3a70d6c05b291d73b66015f98bb075a1c |
| ../../design/concepts-study-linefield-adaptation-2026-10-18.md | 74b99c66428d96947b558a7d3b2e3bd0859f9b21742f1e623306d457680999eb |
| index.html | 53052a9f9de7c1c66020f1df30159c78d1a0e04c564e8ae4bbd010e832534da9 |
| observations.html | 96c4e1c768b3bd633f4de8b41f004225c0c448e67d99c501172ae40244e3e30a |
| sources.html | 00f97435fd5ae72cb99a57417731db686255d432d947d444ff379fefd10075d7 |
| adaptation.html | 3874e71d39d5a0967dbbc11d4a807813e569d2af39cd12f4f9f3e5b6a3855b9f |
| motion.html | 63b79053c6f9dad97a48d1c5c640eeec90735dd8af84053975f5baa19bc52d0a |
| build.ts | 76a085c28181909d9cbee84ab33eecc7e7e40cf8c1260facc9b6bd311eb5eb9b |
| motion-analysis.ts | a0fae536d38001e1fa6820dcda306cf77c7a39d1e87c1e44022d73cc04766afa |
| motion-summary.ts | 90bb9404a783dfc9d4ff39df80f17be6be6cbfdf62f9ea6d4ea1d8f9cdb83900 |
| report.js | a4916c9bc55cefd4c4609177524c2cfb8a814e20a75313db9229cd2628d3ecca |
| report.css | 84707f1003ec0f9ffc810775dd917c5eddba18cc995f12260787b64626705049 |
| report-media.css | 24e2d10174ce305e61938b339ced01b6087550d7c1a2e4732c84bb3c05aec76f |
| assets/motion-frame-analysis.json | 29cba7e400cb52e469d1480dc660b2480ff233f959b3c85b9f48164ef1642a52 |
| assets/motion-property-frame-analysis.json | 899800dd150e2de75d999d22df5d993befb0a5220e69d210d276461dc02d9933 |
| assets/motion-timing-summary.json | ab1ae63af19701a23e0d5f2d79edc7a9175d53e197207a7997d470494d7d1eca |
| assets/motion-property-timing-summary.json | 54ca4c2040dfbda322e958bda75cd6b233fb3fa1f79416e3d505211f52511902 |
| assets/usb-motion-actions.json | e3bde1213ff8b3144244f79073916f61d31f269e44412d02c3785318633857d9 |
| assets/usb-property-change-actions.json | 162fb978286fe6662cb3a2e47facbc3da7808bb5e3486dd1808334f5d79fe57b |
| assets/motion-width-trials.mp4 | d2cf84dc2ce0e5e7574d1987af34eb9e7eb01a72c7a0316fa73d49927810808a |
| assets/motion-color-trials.mp4 | 351dd63a30a41ac1095bc4b14d052102fbbbfc27b63e4f0317928cf8a42e5793 |
| assets/motion-tool-switch.mp4 | 8f5edc69a7789f01f2e35509101f9dff3bbb6b4415ed9b8ee6329ddfa6bc6564 |
| assets/motion-width-values.mp4 | 292f51377c8a8740cfde47a450e486e87e28bf57554a0fa1cf7baba5e55bb547 |
| assets/motion-color-modes.mp4 | 7897551acac3ceb3483d5448459e173dcaf4684de88ff2b16da86e89eeeb973d |
| assets/motion-strip-contact.jpg | 5209d39f312a5ac537c5b96bec249bb89c8c3aaaa8a81f5bdafbf29fb4fff72f |
| assets/motion-color-contact.jpg | 42bb36085a8d939594e0d3b6f5cd8fa66eaf48d6899d3d7ce8c2fdec4d828c83 |
| assets/motion-color-values.jpg | 959a2f4a7c63fccb4256737f8b5490b04efa32f5f90ea53f958c651fbb105e41 |
