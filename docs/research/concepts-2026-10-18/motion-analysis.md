# Concepts circle motion — recorded timing study

Status: measured USB video observations, 2026-10-18. This is competitor research, not Linefield performance acceptance or a measurement of physical pen latency. Times below describe recorded visible changes with explicit sampling limits; they do not reveal Concepts' internal animation constants.

## What the recording establishes

The property strip is visually much faster than the color interface. Its rectangular body appears almost entirely in the first changed captured frame. The smaller hub highlight continues changing afterward. Across repeated trials, the combined property presentation reaches the image-comparison settling threshold in approximately 150–167 ms when opened and 83–100 ms when closed. The RGB color interface is a staged expansion with a longer background-control fade: approximately 700–734 ms to reach that threshold when opened, and 350 ms when closed. These are different operations and should not receive one universal animation duration.

The source movies contain 42 wheel/property/color actions and 12 measured preset changes. Three further HSL/RGB round trips are retained as qualitative interruption evidence; the first incoming HSL presentation is interrupted, and the remaining presentations have insufficient stable hold time for the same endpoint criterion. No completed wheel-collapse/open or Apple Pencil squeeze animation was recorded.

## Capture provenance and limits

Device: physical iPhone 15 Pro Max, iOS 27.0, Concepts 6.36.1 (5415). Input: Device Hub remote UI actions after the owner enabled Developer Mode. Capture: QuickTime Movie Recording, High quality, direct USB iPhone screen feed. This is a different route from the earlier iPhone Mirroring screenshot sequences. The earlier sequences remain unsuitable for timing and are not mixed into this dataset.

Host metadata in the movies identifies Mac14,10 running macOS 27.0.1 (26A434). Both movies contain 1290 × 2796 H.264 video, full-range YUV420, a 1/60000-second timestamp time base, and AAC stereo audio. A numeric FFmpeg volume scan returned mean and maximum at its 16-bit silence floor of −91 dB for both audio tracks. All report excerpts explicitly remove audio. Original files remain unchanged and local.

| Source | Duration | Decoded frames / container frame count | Median frame gap | Largest gap | Gaps above 25 ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| concepts-usb-motion-2026-10-18.mov | 154.188850 s video | 9,128 / 9,138 | 16.667 ms | 69.333 ms | 109 |
| concepts-usb-property-changes-2026-10-18.mov | 199.649933 s video | 11,864 / 11,877 | 16.667 ms | 83.566 ms | 73 |

Both captures are variable cadence. The first stream advertises nominal 60 fps and the second approximately 59.94 fps; neither is evidence of a constant frame delivery interval or the phone display's instantaneous refresh rate. Decoded-frame counts agree between FFprobe's frame listing and FFmpeg's raw decode, but differ from the container's frame-count field. The analysis uses decoded frames and their presentation timestamps, not the container count or frame-number divided by 60. It does not attribute capture gaps to Concepts rendering performance.

Source SHA-256 values: first movie `7a92c351173bd5706dad76dbd25fd63d7da217d3788e6c78f513db4452b26163`; second movie `e8b86d431bbc4292dfca5c5ff1185a18fd7302892e358185f2702f1041f460d0`. Repository base is `fbcc30ca115d630d6c9e688b1525d3ee1dcc89d7`; that is the report's base, not a Concepts source revision.

Brightness, thermal state, battery/power mode, adaptive refresh behavior, Reduce Motion, Reduce Transparency, and competing device workloads were not controlled or measured. The exact iOS build number was not recorded. No callback/CPU/GPU/presentation trace, physical contact marker, or synchronized hardware clock was available. Host action timestamps establish order only; subtracting them from video timestamps would not produce valid input latency.

## Method and uncertainty

The analysis preserves native decoded-frame order and PTS. A fixed research-UI region at source coordinates x=0, y=320, width=1290, height=1290 is downscaled to 320 × 320 grayscale for repeatable image comparison. It contains the wheel, strip, palette, color arcs and affected background controls, excluding the system clock and unrelated content. Full-size and contact-sheet inspection identifies the actions and checks the gross visual behavior; the numerical endpoints remain explicitly operational image thresholds, not a human-perception ground truth.

Start is the first frame where more than 0.05% of the analysis pixels differ by more than 8/255 luminance levels from the pre-action reference. Settled is the first frame where at most 0.01% differ by more than 8/255 from the final reference, with that condition maintained through the remaining observation window. The preset-change study uses 0.05% for settling. The stricter 0.01% threshold retained isolated residual pixel changes and produced tails up to600 ms after the major visible update. Codec/noise contribution is possible, not proven. The immediate-update interpretation therefore depends on the stated threshold; this sensitivity and the separate criterion are retained rather than treating either threshold as perceptual ground truth.

The observed span is settled PTS minus first-changed PTS. A sampling bracket runs from the previous-settled-frame PTS minus first-changed PTS to settled PTS minus previous-unchanged PTS. It expresses endpoint sampling uncertainty under the stated threshold. It is not a confidence interval, and it excludes further uncertainty from compression, scaling, USB transport, the threshold choice and an unobserved physical display. A span of zero means the first changed frame already satisfies the endpoint criterion; it never proves a zero-duration operation. The shortest retained hold after the threshold endpoint is only66.7 ms, so these bounded windows do not establish long-term stability or performance acceptance.

Property bodies appear already extended before the smaller hub highlight reaches its final appearance. Consequently the property totals include hub feedback and must not be described as 167 ms of strip travel. Similarly color-opening totals include the fade of palette/precision controls after the arcs have largely arrived. The first event called `width-retarget` in each logged sequence actually opens width from a closed strip; only the subsequent opacity and smoothing actions retarget an already open strip. Repeated `smoothing-close / 1–3` labels denote the independent second set of closes; event ordering and PTS disambiguate them.

## Summary by operation

| Visible operation | Trials | Median observed span | Observed range | Interpretation |
| --- | ---: | ---: | ---: | --- |
| Open width | 3 | 166.7 ms | 151.3–166.7 ms | Body appears immediately in captured samples; hub feedback settles afterward |
| Close width | 3 | 100.0 ms | 83.4–100.0 ms | Body disappears before remaining hub feedback settles |
| Open opacity | 3 | 152.3 ms | 150.0–166.7 ms | Same presentation family as width |
| Close opacity | 3 | 83.4 ms | 83.4–83.4 ms | Sampling precision does not establish an exact internal constant |
| Open smoothing | 3 | 166.7 ms | 166.7–166.8 ms | Same stable hub and overlaid strip |
| Close smoothing | 6 | 83.4 ms | 83.3–83.4 ms | Includes closes after the retarget sequences |
| Width → opacity | 3 | 166.7 ms | 166.7–166.7 ms | Contents change while the strip footprint remains fixed |
| Opacity → smoothing | 3 | 166.7 ms | 166.7–166.7 ms | Hub highlight changes; tools remain underneath |
| Open RGB color interface | 3 | 725.1 ms | 700.1–733.5 ms | Arc expansion plus background/palette fade |
| Close RGB color interface | 3 | 350.1 ms | 350.1–350.1 ms | Faster retreat/restore than opening |
| Pencil → Select | 3 | 108.4 ms | 108.4–116.7 ms | Tool, hub capabilities and palette presentation change |
| Select → Pencil | 3 | 266.7 ms | 250.0–266.7 ms | Different restoration timing; do not average both directions |

The per-trial table below includes local gaps of up to 50.1 ms. Small differences such as 151 versus 167 ms are not sufficient to infer separate intended durations. Three repetitions are a small descriptive sample, not a statistically validated performance distribution.

## Watch the actual transitions

<figure><video controls muted playsinline preload="metadata" src="assets/motion-width-trials.mp4"></video><figcaption>Three width open/close cycles, original movie approximately 31.6–37.2 s. Cropped, resized, audio removed. Playback is for inspection; measurements use original PTS.</figcaption></figure>

<figure><img src="assets/motion-strip-contact.jpg" alt="Six recorded frames showing the width strip appearing before the hub highlight finishes changing"><figcaption>Read left to right, then down. Original decoded frames 1910, 1911, 1912, 1913, 1917, 1920; the first changed frame is 1911 at32.022633s. The circular hub border remains visible, and the strip overlays outer tools rather than enlarging a tool sector.</figcaption></figure>

<figure><video controls muted playsinline preload="metadata" src="assets/motion-color-trials.mp4"></video><figcaption>RGB close/open repetitions, original movie approximately113.4–118.7s. Arc movement and background-control fades have different phases.</figcaption></figure>

<figure><img src="assets/motion-color-contact.jpg" alt="Six recorded frames of the RGB color arcs expanding while other controls fade"><figcaption>Original decoded frames5921,5922,5928,5934,5945,5961. First detected change99.814083s; threshold-settled100.539233s. This is a sequence of captured frames, not a reconstruction of the proprietary easing curve.</figcaption></figure>

<figure><video controls muted playsinline preload="metadata" src="assets/motion-tool-switch.mp4"></video><figcaption>Select/Pencil switching, approximately134.6–140.6s. Returning to Pencil restores a different hub/palette state from entering Select.</figcaption></figure>

## Width and opacity preset response

Changing width between8 and19.5 or opacity between50% and100% changes the number, preset highlight, thumb and visible brush feedback together within one or two captured changed frames. Observed spans are0–19.8ms; local sampling brackets extend up to66.9ms. This supports an immediate-update interpretation rather than a decorative value tween, but does not prove the internal command or physical display latency. The width and opacity operations are separate: changing width does not progressively increase opacity.

<figure><video controls muted playsinline preload="metadata" src="assets/motion-width-values.mp4"></video><figcaption>Three width preset round trips. Actual temporary brush feedback changes with the preset; the slider itself is not a thickness-preview ramp.</figcaption></figure>

## Color mode switching and a value discrepancy

Switching RGB/HSL first removes the previous arcs and then introduces the next set. It is not just a static label swap. The first HSL presentation starts around193.242900s in movie2 and is superseded by the RGB action around193.94s before a stable HSL endpoint. Later cycles have about one second between requests, with visible changes continuing near the next request; no uncensored exact duration is assigned from this recording. A follow-up should leave at least two seconds of stable destination state per mode and separate press feedback from arc movement.

<figure><video controls muted playsinline preload="metadata" src="assets/motion-color-modes.mp4"></video><figcaption>RGB/HSL switching and final close. The early reversal is useful interruption evidence but unsuitable for a completed-animation median.</figcaption></figure>

There is a visible numeric discrepancy worth investigating independently. Before mode switching, RGB displaysR246/G93/B87. After the round trips, it displaysR246/G91/B85. The initial and final frames both show RGB selected. This report does not establish whether the cause is conversion rounding, an unintended input, a retained value, or another behavior; it does not infer the saved drawing color or claim a confirmed Concepts defect. Linefield should explicitly require that merely changing a color representation cannot mutate the chosen canonical color.

<figure><img src="assets/motion-color-values.jpg" alt="RGB values before, during and after color mode switching"><figcaption>Movie2 frames11486(193.006900s),11588(194.860133s),11814(198.811000s). The middle frame is transitional and has HSL highlighted while RGB arcs remain visible. Compare the first and last stable RGB presentations for87/93 versus85/91; red remains246.</figcaption></figure>

## Animation interpretation and Linefield implications

Verified visual behavior: stable wheel geometry; a constant-size hub; foreground property strip over the tool sectors; hub outline retained; fast strip-content updates; smaller hub emphasis changes; separately staged color arcs; fading of controls behind the color interface. The property strip's translucency is visible, but its exact alpha, material/blur implementation and blend color are not recoverable from this recording alone. Do not report the owner's desired half-opacity as a measured50% Concepts constant.

Inference: the color motion visually accelerates and then settles, and the phases overlap. No fitted cubic Bézier, spring stiffness, damping, delay or animation framework is established. Compression, sparse frame gaps and multiple simultaneously changing layers make a single easing fit misleading. A future controlled capture could track a specified arc endpoint and opacity reference separately; that would still estimate visible motion rather than disclose internal parameters.

For the next Linefield design review, keep tool and property semantics immediate, keep the five illustrated sector geometries fixed, and design host presentation separately from shared Rust commands. Use the research as evidence for hierarchy and timing order, not a requirement to copy every duration. Initial drawing scope still excludes smoothing and additional tools; showing them in a research comparison is not approval to implement them.

Planned validation ownership: ui_ux_designer specifies normal/reduced-motion states and interruption; platform implementers test focus, clipping, pointer capture and edge placement; rendering_performance reviews CT-06/SU-14/SU-16 and INV-08/INV-11 with bounded surface/cache work. Proposed scenarios MOTION-RESEARCH-01(property open/close),02(retarget),03(color open/close),04(tool switch),05(preset change),06(mode interruption) identify this evidence only. They are not passed Linefield runtime acceptance IDs. Future release checks must separately measure frame/main-thread/memory behavior while drawing and loading, exact host/build/display/scale/refresh, surface loss, stale scenes and cold/warm/evicted parity. No GPU benchmark or physical pen-to-screen measurement was performed here.

## Reproduction and retained evidence

Analysis uses FFmpeg/FFprobe7.1.1 extracted from the existing Android Studio bundle `ffmpeg-7.1.1-1.5.12-macosx-arm64.jar`, not an installed project dependency. The helper expects the extracted binaries at `/tmp/linefield-motion-tools/org/bytedeco/ffmpeg/macosx-arm64/`. Run `node motion-analysis.ts` and `node motion-analysis.ts --properties` from this folder, then `node motion-summary.ts`. The first two decode original media; the last applies the documented thresholds and produces the per-trial tables and JSON. Frames are identified with zero-based indices. Movie metadata creation dates are not used as a timing origin.

Retained local evidence includes original movies, action-order logs, full frame PTS and comparison values in `assets/motion-frame-analysis.json` and `assets/motion-property-frame-analysis.json`, plus `assets/motion-timing-summary.json` and `assets/motion-property-timing-summary.json`. The excerpts are software-encoded H.264 with no audio; they are viewing aids and must not replace the originals for timing. All derived media show only the research drawing/UI. Raw captures remain excluded from publication by the report's local-only policy.

The two helpers passed explicit strict TypeScript, Oxlint and formatting checks; each is below200physical lines after formatting. These are research-script checks, not app tests. No app code, drawing semantics, renderer choice or gallery transition changed.

## Per-trial wheel and property presentation measurements

PTS values are seconds from the beginning of movie1. Extra decimal places preserve the recorded timestamps; they do not imply microsecond measurement accuracy. Sampling brackets use the definition above.

| Event | Operation / trial | First changed PTS | Settled PTS | Observed ms | Sampling bracket ms | Largest gap ms |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| M1-01 | width-open / 1 | 32.022633 | 32.173900 | 151.3 | 134.6–167.9 | 50.0 |
| M1-02 | width-close / 1 | 32.690683 | 32.790700 | 100.0 | 83.4–133.5 | 33.4 |
| M1-03 | width-open / 2 | 33.707567 | 33.874267 | 166.7 | 150.0–200.1 | 33.4 |
| M1-04 | width-close / 2 | 34.707783 | 34.807817 | 100.0 | 83.4–133.5 | 33.5 |
| M1-05 | width-open / 3 | 35.708017 | 35.874717 | 166.7 | 150.0–200.2 | 33.5 |
| M1-06 | width-close / 3 | 36.708233 | 36.791583 | 83.4 | 66.7–116.8 | 33.5 |
| M1-07 | opacity-open / 1 | 51.159233 | 51.311483 | 152.3 | 135.6–168.9 | 50.0 |
| M1-08 | opacity-close / 1 | 51.828250 | 51.911617 | 83.4 | 66.7–116.8 | 33.4 |
| M1-09 | opacity-open / 2 | 52.828483 | 52.978517 | 150.0 | 133.4–183.5 | 33.5 |
| M1-10 | opacity-close / 2 | 53.828700 | 53.912050 | 83.4 | 66.7–116.8 | 33.5 |
| M1-11 | opacity-open / 3 | 54.828917 | 54.995617 | 166.7 | 150.0–200.2 | 33.5 |
| M1-12 | opacity-close / 3 | 55.829133 | 55.912483 | 83.4 | 66.7–116.8 | 33.5 |
| M1-13 | smoothing-open / 1 | 56.846033 | 57.012733 | 166.7 | 150.0–200.2 | 33.5 |
| M1-14 | smoothing-close / 1 | 57.846250 | 57.929600 | 83.4 | 66.7–116.8 | 33.5 |
| M1-15 | smoothing-open / 2 | 58.863133 | 59.029883 | 166.8 | 150.1–200.2 | 33.5 |
| M1-16 | smoothing-close / 2 | 59.913400 | 59.996750 | 83.3 | 66.7–116.9 | 33.5 |
| M1-17 | smoothing-open / 3 | 60.896950 | 61.063650 | 166.7 | 150.0–200.2 | 33.5 |
| M1-18 | smoothing-close / 3 | 61.897167 | 61.980533 | 83.4 | 66.7–116.9 | 33.5 |
| M1-19 | width-open (retarget sequence) / 1 | 76.050283 | 76.217067 | 166.8 | 150.1–186.5 | 33.4 |
| M1-20 | opacity-retarget / 1 | 76.750517 | 76.917217 | 166.7 | 150.0–200.1 | 33.4 |
| M1-21 | smoothing-retarget / 1 | 77.734067 | 77.900767 | 166.7 | 150.0–200.2 | 33.5 |
| M1-22 | smoothing-close / 1 | 78.717617 | 78.800967 | 83.3 | 66.7–116.8 | 33.5 |
| M1-23 | width-open (retarget sequence) / 2 | 79.701167 | 79.867867 | 166.7 | 150.0–200.2 | 33.5 |
| M1-24 | opacity-retarget / 2 | 80.668050 | 80.834750 | 166.7 | 150.0–200.2 | 33.5 |
| M1-25 | smoothing-retarget / 2 | 81.668317 | 81.835017 | 166.7 | 150.0–216.8 | 50.1 |
| M1-26 | smoothing-close / 2 | 82.651867 | 82.735217 | 83.4 | 66.7–116.8 | 33.5 |
| M1-27 | width-open (retarget sequence) / 3 | 83.652083 | 83.818817 | 166.7 | 150.1–200.2 | 33.5 |
| M1-28 | opacity-retarget / 3 | 84.669000 | 84.835700 | 166.7 | 150.0–200.2 | 33.5 |
| M1-29 | smoothing-retarget / 3 | 85.669217 | 85.835933 | 166.7 | 150.0–200.2 | 33.5 |
| M1-30 | smoothing-close / 3 | 86.652767 | 86.736133 | 83.4 | 66.7–116.8 | 33.5 |
| M1-31 | color-open / 1 | 99.814083 | 100.539233 | 725.1 | 691.8–741.8 | 33.3 |
| M1-32 | color-close / 1 | 113.925500 | 114.275583 | 350.1 | 333.4–384.7 | 34.6 |
| M1-33 | color-open / 2 | 114.725683 | 115.425833 | 700.1 | 683.5–716.8 | 33.3 |
| M1-34 | color-close / 2 | 115.692600 | 116.042667 | 350.1 | 333.4–383.4 | 33.4 |
| M1-35 | color-open / 3 | 116.776167 | 117.509667 | 733.5 | 700.1–750.2 | 33.4 |
| M1-36 | color-close / 3 | 117.693033 | 118.043117 | 350.1 | 333.4–383.4 | 33.4 |
| M1-37 | select-tool / 1 | 135.121967 | 135.230317 | 108.4 | 91.7–133.5 | 25.1 |
| M1-38 | pencil-tool / 1 | 135.830500 | 136.097233 | 266.7 | 250.1–283.4 | 33.4 |
| M1-39 | select-tool / 2 | 136.830733 | 136.947417 | 116.7 | 100.0–133.4 | 25.0 |
| M1-40 | pencil-tool / 2 | 137.814217 | 138.064267 | 250.0 | 233.4–266.7 | 16.7 |
| M1-41 | select-tool / 3 | 138.822767 | 138.931133 | 108.4 | 91.7–133.4 | 25.0 |
| M1-42 | pencil-tool / 3 | 139.797983 | 140.064717 | 266.7 | 250.1–300.2 | 33.4 |


## Per-trial preset changes

PTS values are seconds from the beginning of movie2. Zero observed span means unresolved within a single changed frame, not zero internal duration.

| Event | Operation / trial | First changed PTS | Settled PTS | Observed ms | Sampling bracket ms | Largest gap ms |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| M2-01 | width-19.5 / 1 | 17.104133 | 17.104133 | 0.0 | 0.0–36.9 | 36.9 |
| M2-02 | width-8 / 1 | 17.754350 | 17.771017 | 16.7 | 0.0–50.2 | 33.5 |
| M2-03 | width-19.5 / 2 | 18.737967 | 18.754633 | 16.7 | 0.0–66.9 | 50.3 |
| M2-04 | width-8 / 2 | 19.688183 | 19.688183 | 0.0 | 0.0–50.2 | 50.2 |
| M2-05 | width-19.5 / 3 | 20.671733 | 20.688400 | 16.7 | 0.0–50.2 | 33.5 |
| M2-06 | width-8 / 3 | 21.655283 | 21.671950 | 16.7 | 0.0–66.9 | 50.2 |
| M2-07 | opacity-50 / 1 | 36.391833 | 36.391833 | 0.0 | 0.0–50.2 | 50.2 |
| M2-08 | opacity-100 / 1 | 37.125333 | 37.142000 | 16.7 | 0.0–66.8 | 50.1 |
| M2-09 | opacity-50 / 2 | 38.092217 | 38.108883 | 16.7 | 0.0–66.9 | 50.2 |
| M2-10 | opacity-100 / 2 | 39.075767 | 39.095600 | 19.8 | 0.0–53.4 | 33.5 |
| M2-11 | opacity-50 / 3 | 40.075983 | 40.075983 | 0.0 | 0.0–47.0 | 47.0 |
| M2-12 | opacity-100 / 3 | 41.059383 | 41.076067 | 16.7 | 0.0–66.5 | 49.9 |

