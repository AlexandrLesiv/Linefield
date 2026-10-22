# WEB-DIAG-D1.1 — Developer diagnostics

Adopted by the lead on 2026-10-22 under decision243 after ui_ux_designer review. The owner
approved the direction and delegated these concrete refinements. P05-DIAG01 implements this
specification; source design review is not implemented UI, linguistic or runtime acceptance.
Use the bounded data and privacy policy in ../logging.md and existing Linefield foundations.

## Entry and layout

Add Developer diagnostics to drawing settings after the existing settings content. It replaces
the settings body with one nonmodal labelled dialog; Back to settings and Close remain. No
route, query switch, global shortcut, persistent preference or additional stacked panel. Open
only while the editor is idle; do not cancel or queue around a stroke. Do not trap Tab or make
the editor inert. Canvas position, backing size and mapping remain unchanged.

Align to the logical inline end of Settings. Preferred width24rem, at most visual viewport
width minus16px/safe areas; at320px use304px or the available safe width. Keep8px edge clearance,
one vertically scrolling body within available height, no horizontal scrolling. Preserve DOM
identity and scroll during value updates. Rows wrap to one column when needed; full statuses,
reasons and actions remain readable. Hit targets are at least44px.

Order: title/actions; privacy/timing disclosure; capture status/actions; Pin metrics checkbox;
render/input, worker/cache and memory metrics; capture integrity/build identity. Use definition
lists and semantic headings, no live event table or raw JSON. Use existing surface/text/muted/
line/focus/error tokens,10px control radii,12px content insets,8px within groups and16px between
groups. System font,1rem semibold title,0.875rem labels and tabular numeric values. Errors have
text as well as color. Forced colors retain visible system-color borders/focus. No animations,
tweened numbers or pulsing indicators; reduced-motion behavior is the same.

## Pinned metrics

Pin metrics is off initially and independent of capture. The tab retains the preference across
Back/Resume, while the gallery has no overlay. Place an opaque, noninteractive panel above the
footer's occupied area at logical inline end,8px inset, below interactive chrome/panels. Maximum
width is min(22rem,available width−16px), with8px padding/radius and0.75rem tabular text. It may
cover artwork by the user's explicit pin action; never overlap controls or the unsaved notice.
If insufficient space remains, suppress it without changing the checked preference and report
Metrics hidden: not enough space in settings. Resume when space returns.

Four wrapping rows show submitted frames/validated updates; accepted-not-submitted and input
callback p95/max; worker queued/active, ready bytes and GPU geometry live/allocated; cache
hits/misses, upload rate and capture state. No unexplained abbreviations replacing full labels.
The overlay and descendants have no pointer/wheel/touch handling, focus or text selection.
It is aria-hidden; the full panel exposes readable, non-live metric rows.

Refresh text at most twice per second, using a labelled rolling1s rate window. Observe only
while panel, pin or capture needs data. Do not request canvas redraws, GPU readback, extra
fences or an idle animation loop for diagnostics. Idle shows Idle with the last observation
and its age, not a fabricated FPS fault. Update idle age on legitimate activity/opening. Hidden
tabs stop observation; terminal editor failure forbids further Wasm getters.

## Metric meanings

| Metric | Required interpretation |
| --- | --- |
| Frames/s (submitted) | Application render submissions, not physical display FPS. |
| Validated updates/s | Complete validated publication receipts; a static canvas may produce none. |
| Browser scheduling interval | Existing callback interval observations only; Unavailable if no suitable observation exists. No extra idle rAF loop. |
| Input callback p95/max | Bounded aggregate batch duration with count/window, not physical pen latency or an always-on sample trace. |
| Accepted not submitted | Only compatible Rust-authorized source and submitted-coverage watermarks in the same interaction/revision; otherwise Unavailable. Never subtract geometry vertex counts or unrelated strokes. |
| Input-to-submission | Optional detailed matched-input software measurement, never pen-to-screen timing. |
| Source/render state | Current, Rebuilding (historical image), Pending or Unavailable from valid receipts, not queue length. |
| Memory | Accounted allocation bytes with live/allocated/Wasm high-water distinguished; driver estimates separately labelled. No process-residency claim or double-counting. |
| Age/unavailable | Stale values, unknown values and real zero are distinct. |

Counters do not gate editing or issue performance verdicts. Brush/view settings remain outside
the diagnostic allowlist; they are test scenarios rather than implicit export permission.

## Capture and export states

Start/New capture, manual Stop, Download and Clear require an idle canvas. While capturing,
Start/New, Download and Clear are unavailable; Stop (when idle), Pin and Close remain available.
Without a retained report, Download/Clear are unavailable. Automatic expiry is independent of
gesture state and never interrupts input. Availability changes must not flash the tools rail.

An idle, visible failed editor may still open diagnostics and inspect/download/clear retained
host-only data. New capture requires a usable nonterminal editor. Terminal failure freezes an
active capture as Partial; metrics observation and all Wasm getters remain off. An already
running capture may continue through nonterminal recovery using safe host events/aggregates.
The host reports idle after acquisition is detached; never query a poisoned editor to decide
diagnostic availability. Diagnostic inspection does not make drawing usable again.

| Trigger | Behavior |
| --- | --- |
| Capture for 30 seconds | Start atomically, close panel, focus ready canvas. Capture does not automatically pin metrics. |
| New capture with report retained | Label New capture (replaces report), disclose one-report retention. Replace only after successful initialization; failure keeps old report. No confirmation dialog. |
| Stop | Freeze report; preserve focus by replacing the action in place with Download JSON. Never download automatically. |
| Duration expires | Ready if no loss; no focus change, reopened panel or interrupted gesture. |
| Event/byte limit | Exclude the overflowing record, freeze Partial with exact reason/count/time. Include bounded metadata and baseline prelude within the cap. |
| Hidden tab or accepted editor departure | Freeze Partial with reason; no navigation guard or automatic restart. Rejected departure does not stop capture. |
| Terminal editor failure | Freeze Partial with the terminal reason; preserve report inspection/export through host-only state. No new capture or editor queries. |
| Dropped/rejected record or sink failure | Expose partial/loss counters, freeze if continuation is unsafe; never fail an edit or recursively log the failure. |
| Download JSON, idle frozen report | Serialize bounded immutable data off input callbacks. Disable duplicate export/replacement/clear while preparing, but keep editing/close/pin available. |
| Drawing begins during export preparation | Drawing proceeds. Do not initiate a download during a gesture. If activation cannot be retained, show Ready to download and require another explicit idle Download action. No queued post-stroke native prompt. |
| Download initiated | Say Download requested, retain report; do not claim a file was saved. |
| Export failure | Safe-category inline failure with Retry; preserve frozen report. |
| Clear | Release detailed report/export bytes, not drawing/history or the ongoing baseline ring. |
| Reload/tab close | Report is lost; no durability promise or new unload guard. |

Hidden/departure/terminal transitions, Clear and report replacement fence any export preparation
generation. Resume or another user activation cannot revive a stale automatic download, even if
the interaction epoch did not change. Require a fresh explicit idle Download action.

Use baseline1024events/1MiB; detailed30s/4096events/2MiB first limit including prelude/metadata.
Keep one report per tab, with actual object/export allocations independently bounded. Baseline
overwrites and actual drops are different counters. Temporary download URLs are revoked when
no longer needed. Detailed capture may affect timing; state that in the disclosure.

## Input, focus and accessibility

Opening focuses the title. Close/Escape from panel returns focus to connected Settings;
Back to settings focuses its diagnostics entry. Native field/IME Escape retains priority;
do not also dispatch canvas Escape. Tab may leave the nonmodal panel without focus recapture.
Outside pointerdown closes without focus restoration; the original event continues to the
canvas once. No synthetic redispatch or blanket preventDefault. Existing focus-loss cancel,
browser context menus, native shortcuts, history and OS download handling remain unchanged.

Only explicit capture start/stop/failure gets one polite status announcement. Counters and
countdown are not live regions; completion never steals focus. Pin requires no new shortcut.
Normal and reduced motion have identical immediate transitions.

## Localization and acceptance

Stable diagnostics.* IDs and full English/Ukrainian messages use the existing typed catalogues;
regional numeric formatting stays separate from UI language. JSON keys/status categories stay
locale-independent. Isolate technical build values for bidi; never mirror artwork. Source
translation, proficient linguistic review and runtime layout are separate evidence.

Key copy: Developer diagnostics / Діагностика для розробників; Pin metrics / Закріпити показники;
Capture for 30 seconds / Записувати протягом 30 секунд; Stop capture / Зупинити запис;
Download JSON / Завантажити JSON; Clear report / Очистити звіт; Report ready / Звіт готовий.
Author all limit/lifecycle/failure reasons as complete messages, not concatenated suffixes.

Require DIAG-01–06, CT-07/SU-15 and I18N-LAUNCH-002/I18N-UK-002. Review320×568,568×320,
intermediate493×700,600×900,768×1024,1024×768,1440×900,2560×1440 and continuous resizing;
100/200% text, en/uk, expanded/RTL, themes/forced colors, keyboard/IME and hidden lifecycle.
Prove real pointer input beneath pinned metrics, expiry during drawing, bounded capture/export
failures, privacy canaries and same-workload overhead off/on. Screenshots alone do not establish
no interception, accessibility or physical Wacom latency. Record exact build and limitations.
