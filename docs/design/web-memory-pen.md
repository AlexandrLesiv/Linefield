# In-memory web pen — drawing screen amendment v3

Status: **owner approved choices 1A/2A (RAM drawing/settings and Undo/Redo retention),
3A/4B (mouse/pen input with browser-owned touch gestures), 5A (width/native color controls),
G1 pan/zoom in the first slice, and G2–G4/W1–W4/C1–C3 as recorded in the companion approval
packet. C4 means soft operating targets without automatic suspension at target excess.
P1 pan/zoom mappings and viewport retention, H1 indivisible history-entry retention, and
S1–S4 screen/lifecycle recommendations are owner approved**. The separately confirmed
[P05-E01](../../tasks/P05-E01.md) implements the empty runtime screen; its task records actual
visual review and evidence. Pen and pan/zoom behavior remain unimplemented P05-E02 scope.
Task: [S02-W01](../../tasks/S02-W01.md), confirmed first on 2026-10-19, including bounded
synthetic numerical experiments. Base: integrated `8dbd9b1` (PR #7). Design identity:
`WMP-D3`, states `D3-01`–`D3-13` below, together with this file's final PR revision/hash.
The approved P1/H1/S1–S4 recommendation batch was presented against revision `797ffb1`.
On 2026-10-19 the owner explicitly replied, “I approve P1, H1 and S1–S4.” This revision
records that disposition for `WMP-D3`, including states `D3-01`–`D3-13`; it does not claim
approval of unimplemented screenshots, exact translation wording or new technical mechanisms.

This narrow amendment extends the [selected drawing screen](drawing-screen.md), whose reference
hash is `5e0bde75591c868d12c0548ce916c746d5d8918ea430c38a19f203da4d341123`.
It keeps the slim left rail, contextual top row, gallery, sample previews and shared Linefield
styles. It proposes real pen behavior only for the existing blank New entry. Its companion
[contract packet](../interfaces/web-memory.md) owns exact types, numerical limits, geometry,
resource accounting and fault dispositions. Neither document approves the other implicitly.

## Approved design choices

On 2026-10-19 the owner selected **1A and 2A**: retain the temporary drawing and accepted
settings, and retain both Undo/Redo stacks across gallery Back/Resume. The owner also selected
**3A** browser-reported effective pen pressure with constant-width mouse input, **4B** touch
does not draw and remains browser-owned, and **5A** width slider 1–512/default 8, initial black
and browser-native color picker for now. These choices are approved for this in-memory web
slice; do not request them again. The owner also selected **G1** pan/zoom in this first slice
and approved G2–G4/W1–W4/C1–C3 as identified in the companion contract/approval record. G1
supersedes fixed zoom/center for this slice. **P1** approves the concrete mouse/keyboard pan,
zoom buttons and retained viewport described below. Exact Rust signatures and zoomed
numerical evidence remain engineering responsibilities in the companion contract.
**C4** clarifies 320 MiB CPU / 96 MiB graphics as soft operating targets: excess alone does
not stop editing. **H1** approves retaining the newest indivisible Undo entry beyond the
16 MiB retirement target after eligible older entries retire. **S1–S4** approve the narrow
screen amendment: unavailable tools, Undo/Redo controls, temporary-lifetime disclosure and
best-effort reload/close warning, and accessible adaptive layout. Do not request these again.
P05-E01 has separate owner scope/position confirmation; P05-E02 still requires it. Later touch configuration or picker replacement is
separate backlog/review scope, not an implied setting or new picker in this slice.

1. **Approved 1A/2A:** retain one temporary Rust document, accepted pen settings and its bounded
   Undo/Redo history in this page's memory across accepted gallery returns. Resume preserves
   both stacks and their current position. No library record, thumbnail, persistence or recovery.
2. **Approved presentation:** while that document exists, replace both desktop New and compact New
   actions with **Resume temporary drawing**. Change their plus pictogram to the existing Pen
   pictogram; retain position and target. The action never silently starts a replacement. No
   second temporary drawing, clear/reset command, extra gallery tile or launch restoration.
3. Show an always-visible not-saved disclosure in the editor, plus a gallery disclosure when
   retained. Explain reload/tab-close loss and retention of drawing/history across gallery return.
4. Enable Pen, width, color, in-memory Undo/Redo and the selected pan/zoom scope. Other tools
   remain unavailable; opacity is fixed at 100% and smoothing is Off. Use explicit zoom
   buttons and mouse/keyboard pan below; zoom starts at 100% and spans the selected 10%–800%.
5. **Approved 3A/4B/5A:** mouse and pen draw; browser-reported pen pressure drives width, while
   mouse uses constant width and touch retains browser gestures without drawing. Use the
   browser-owned opaque sRGB color input for now, width slider 1–512/default 8 and initial
   black. S1/S2 approve the control presentation and Undo/Redo buttons/shortcuts below.

Ordinary in-app Back retains work/history and needs no discard prompt. New-always-blank or
clearing history on departure conflicts with the selected 1A/2A lifecycle and is not a current
alternative. Reload remains the browser's action, never the app's suggested capacity remedy
while usable RAM content exists.
This same-page Resume is not automatic launch restoration or the durable Continue feature
excluded by decision 19. No storage decision is reopened or made a prerequisite.

## User goal, authority and routes

Goal: open New, make visible solid round strokes with chosen width/color, pan/zoom the view,
cancel an unfinished stroke and undo/redo completed strokes. The drawing is visibly temporary. Existing sample-card
names, gallery rename/removal behavior and preview artwork remain as in the integrated build.
Samples do not become imported/editable documents. The existing sample preview disclosure
remains, and its controls retain their current prototype-only semantics; the new real Undo/Redo
pair is not shown for samples. Opening a sample while the temporary document is retained leaves
that document alone. The existing Reset samples action never releases the temporary document.
The new shared pan/zoom controls also belong only to the temporary editor; sample previews
retain their existing presentation and acquire no Rust viewport/editing authority.

Rust owns document/interaction/history/settings/capability state. Browser code acquires events,
performs native event-to-element conversion, hosts native controls and presents accepted Rust
projections. It does not compute world points, pressure geometry, edit policy or a second model.
One temporary identity and one active session come from Rust; URLs grant no authority.
The session is an editing attachment with fresh generations on re-entry, not the lifetime
of Undo/Redo history. History belongs to the retained temporary document. Leave releases
the attachment/mapping and cancels unfinished input without clearing either history stack.
New accepted strokes may clear the redo branch and bounded history may retire oldest whole
operations under the reviewed contract; navigation alone never does. Under H1, the 16 MiB
history allowance is a retirement target: retain the newest whole stroke's Undo entry even
when that entry alone exceeds the target, after retiring eligible older entries on a successful
commit. Never split a stroke, commit it without Undo, or retire history on failed/cancelled
edits to satisfy the target. Page teardown/reload
loses drawing, settings and history together; no durable or crash-recovery claim is implied.

Keep `/` and existing `/drawing/<sample-id>` routes. Reuse `/drawing/preview-new` for the
same-page temporary editor; its historical spelling is an implementation detail. Accept it only
with a live temporary owner or an explicit New request. On cold direct entry/reload, replace
that route with `/` and announce temporary drawing unavailable; never silently show a new blank
as recovered content. New from the gallery is the only initial creation intent. Same-page
Forward to the temporary route resumes content/history with a fresh editing attachment. Back to a
sample remains a preview. Validate unknown routes through the existing safe gallery fallback.

Departure ordering is narrow and explicit. Prepare the destination's inert shell and validate
its availability before leaving; perform any fallible browser-history write before Rust Leave.
Back requests browser traversal, then waits for actual `popstate`; a Back click without a
traversal event does not release the attachment; neither event clears Undo/Redo. On `popstate`
the browser has already selected its
entry, so no synthetic duplicate entry is pushed. Recheck the latest route-request generation
immediately before synchronous Leave, with no await between that check and the command.
An obsolete request does nothing and reconciles the newest one. Only accepted Leave is the
semantic departure; switch to the prepared destination, then run optional motion. A later
animation/display failure settles that destination or its unavailable state without restoring
an obsolete attachment or changing retained history. Initialization/browser-history-write
failure before Leave preserves the accepted attachment and document/history.
If Leave unexpectedly rejects with usable authority, retain the accepted editor and show
navigation unavailable; attempt one generation-guarded URL reconciliation to its accepted
route. Browser history rollback is not guaranteed, and no traversal loop or automatic retry
may pretend it is. A reconciliation failure keeps editing suspended and Back available.
If authority is fatal, use D3-10; Back changes host presentation while keeping the tombstone,
without invoking unsafe Rust commands or claiming usable preserved history after engine failure.

**Approved S3:** request a best-effort native browser reload/close warning while completed or
redoable artwork exists, including while the drawing is retained in the gallery. An empty
owner with no redoable artwork does not activate the warning; Undo-all with a redo branch
does. Ordinary same-page Back/Resume needs no warning. The browser owns the warning text,
whether it appears and the final leave decision; do not promise prevention or recovery or
add an app modal as a substitute. Keep the persistent disclosure visible before first ink.
Browser reload/close/origin navigation may lose RAM; no saving,
storage permission, export download or guarantee is implied. BFCache is not durable recovery:
on a genuine restored live page, cancel stale input and revalidate owner/surface before editing;
a missing owner follows the unavailable path. Hidden/blurred page alone does not clear history.

## State graph and behavioral checklist

Transitions below are semantic; animation completion cannot create/release a session, clear
history, commit/cancel ink or authorize a destination. Navigation request generations fence
late loaders, renderer work and focus restoration. Repeated requests are coalesced, not queued.

| State | Trigger / precondition | Outcome, next state and invariant |
| --- | --- | --- |
| D3-01 Gallery, no temporary owner | Explicit New | Reserve/create through Rust and show D3-02; accepted route matches destination. No sample mutation or new card. |
| D3-02 Initializing | Wasm and CanvasKit/surface become ready for current request | Fresh creation enters D3-03 blank editor; selected Pen, width 8, opaque black, empty history. Resume preserves ink/settings and both history stacks as D3-05 specifies. Loading has no fake percentage or decorative minimum delay. Back can cancel entry. Late completion after Back is released, never reopened. |
| D3-03 Ready, empty or completed ink | Admitted primary mouse/pen contact on canvas, idle, surface ready | D3-04 active stroke with captured Rust settings/mapping/identity. Touch never begins ink and retains browser gesture handling. An empty ready canvas needs no instructional modal. |
| D3-04 Drawing | Ordered actual mouse/pen samples, then matching end | One complete round stroke, one history operation; D3-03. Brief mouse/pen contact gives a dot. Duplicate-position/pressure behavior follows exact Rust geometry contract. No prediction, filtering, tilt or opacity behavior. |
| D3-04 Drawing | Escape, window blur, hidden page, pointer cancellation/capture loss (except D3-04R), navigation request or mapping invalidation | Cancel current interaction before transition/remap. Remove its entire transient stroke, preserve completed ink/settings and both history stacks; reject late input. Accepted departure releases the editing attachment without clearing history. Remain D3-03 unless navigating or unavailable. No half-stroke commit. |
| D3-04R Awaiting pen release | Owner-approved trusted primary pen canvas capture loss with zero buttons and button −1, matching the current contact | Freeze the provisional stroke without adding samples or committing. Show a localized nonblocking “Waiting for pen release. Press Escape to cancel.” notice; no overlay, focus transfer, timer or polling. Rust continues to guard settings and Undo/Redo. Escape and Back remain usable. |
| D3-04R Awaiting pen release | Genuine matching up with current identity/mapping and valid timestamp, regardless elapsed time | Ordinary Rust End once; retain the completed stroke and enable one-operation Undo after coherent presentation. Remove the pending notice. Zero-button hover and repeated matching capture loss do not change the prefix. |
| D3-04R Awaiting pen release | Explicit interruption, pressed movement, conflicting capture, or fresh eligible canvas down | Cancel through Rust, removing only provisional ink. A fresh down immediately proceeds as a new normal Begin; do not waste the next stroke. Other interruptions follow D3-04 cancellation. Wrong-pointer/recognizably stale release cannot finish the newer contact. No later event means the frozen state persists with explicit Escape/Back exits. |
| D3-04 Drawing | Undo/Redo, tool/style change, app pan/zoom, competing drawing pointer or browser touch gesture | Rust rejects conflicting commands; no queue, forced finish/cancel or settings/viewport mutation. Availability visibly disabled. Competing pointer events cannot finish/cancel the owner. Touch is not submitted as ink; browser gesture takeover can issue pointercancel and cancel the active pen stroke. |
| D3-03 Ready | Accepted Back or same-page departure | Cancel transient field adjustment; release the editing attachment only at successful semantic departure. D3-05 retains document/settings and both history stacks. Failed/cancelled destination keeps the old attachment and history. Gallery itself has no temporary-document Undo/Redo command. |
| D3-05 Gallery with retained document | Resume or valid same-page Forward | D3-02 if surface rebuild needed, then D3-03 with retained ink/settings, Undo/Redo stacks and history position. Fresh attachment/mapping generations reject stale input. Gallery focus/scroll survive. Resume remains available after sample navigation; unavailable variants keep their guards. |
| D3-06 Initialization failure | Asset/runtime/surface fails before usable entry | Localized error overlay within the canvas area, Retry and Back. Retry only the failed idempotent initialization stage; current request token required. Never claim drawing recovered. |
| D3-07 Rejected stroke/capacity | Invalid/inadmissible current batch or actual resource allocation failure | Cancel only its unfinished stroke; existing ink/history preserved. Show the actual reason once, not per sample. Soft CPU/graphics target excess is not this failure and cannot itself cancel/reject ink. Subsequent fresh stroke is allowed when the required resources and validated shared admission permit it. |
| D3-08 History retention boundary | Successful commit retires eligible older whole operations in Rust | Existing ink remains; Undo availability matches retained operations. Keep the newest indivisible entry even above the 16 MiB retirement target. Announce oldest Undo steps unavailable once per eviction episode. No pretend unlimited history. A failed/cancelled edit or navigation cannot secretly evict history. |
| D3-09 Surface unavailable | Context loss or backing-size admission failure with Rust owner usable | Cancel transient input, suspend canvas drawing; preserve document/history. Show Retry display for context loss; size failure asks to resize the window. Rebuild from accepted RAM scene, not host copies. Renderer errors never reset document. |
| D3-03/D3-04 Operating target exceeded | Observed owned CPU exceeds 320 MiB or graphics exceeds 96 MiB, without actual resource failure | Continue accepted editing. Evict disposable caches/reduce optional rendering work first; never drop actual samples, change artwork or silently replace the owner. No automatic page-lifetime suspension, refusal, modal or failure announcement merely at the target. Record bounded diagnostic evidence. |
| D3-09 Actual resource failure variant | Required rendering allocation fails while Rust owner remains usable | Cancel unfinished input; suspend only operations dependent on the unavailable display/resources, preserving completed ink and both history stacks. Show `memory.resourceUnavailable`, Retry display and Back. A deliberate Retry or Resume may make one fresh display attempt with the same owner; success restores usable rendering, failure keeps the message and RAM. No retry loop, guaranteed recovery, blank replacement or reload-as-recovery suggestion. Trap/OOM with uncertain owner uses D3-10. Cover target excess versus actual failure separately in WMP-05/09. |
| D3-10 Fatal engine failure | Wasm trap/poison or unusable authority | Fail closed; disable edits/history/settings. Keep last completed image only if safely available, visibly marked unavailable. Explain RAM cannot be recovered here. Back remains available; no Retry that silently replaces owner/content. |
| D3-11 Temporary content unavailable | Cold temporary URL or missing owner after page restoration | Gallery, unavailable announcement, New available. Do not claim previous content intact, saved or recoverable. |
| D3-12 Preview | Open existing raster sample | Existing non-editable sample screen; no pen intake/history command. Return preserves temporary owner if present. |
| D3-13 Panning | Idle canvas, accepted Space + primary mouse/trackpad drag | Rust captures viewport and pointer base. Updates derive from that base; release Space or pointer ends at the accepted viewport. Escape/blur/capture loss restores pre-pan viewport. Resize/display remap cancels before installing new mapping. No ink, document revision or Undo operation; fresh input required after cancellation. |
| D3-03 View change | Idle canvas, zoom button or focused Arrow key | Rust accepts a bounded center-anchored zoom step or directional pan step, publishes new mapping and keeps artwork/history unchanged. Invalid or stale requests reject unchanged; no delayed replay after ink ends. |

If a fatal owner still exists, Resume opens D3-10, never allocates a blank replacement. Only a
fresh page begins a new lifetime. Back from D3-10 returns gallery without a false retained-work
promise: gallery shows the fatal explanation instead of the ordinary retention disclosure.
When allocation fails before any owner was created, gallery keeps New. The Rust packet must
expose this distinction; host code may not infer it from a rendered blank canvas.
An owner with zero strokes still counts as retained: Undo-all, cancelled first stroke and
enter-then-Back retain the same temporary identity/settings, title and Resume label. Do not
infer disposal or replacement from an empty image. Undo-all → Back → Resume retains the blank
drawing and its redo branch: Redo restores the same strokes. A fresh accepted stroke after
Resume clears that redo branch according to the shared edit contract; Back itself does not.

## Controls, inputs and focus

- **Width (5A):** native HTML range, integer step 1, approved 1–512/initial 8, localized numeric value
  and accessible value. Arrow/Home/End/Page keys use native range behavior. Host-local drag is
  an uncommitted field adjustment; on change/end submit one validated settings replacement.
  Escape, pointer cancel, blur or navigation abandons uncommitted adjustment and restores the
  last accepted value. A rejected command also restores accepted value; no delayed replay.
  Do not add a numeric text field or new curve/preset control. The icon sample is an illustrative
  pictogram, not a second stroke renderer. Accepted setting affects only subsequent strokes.
- **Color (5A):** browser-native picker for now; existing round rail position hosts a labeled
  native `input type=color`, initially opaque black. Opaque
  sRGB hex channel values convert to normalized floats at the host boundary, validated by Rust.
  For accepted `#RRGGBB`, divide each byte by 255 and use alpha 1; these are encoded sRGB
  channels, not linear-light values. Do not quantize prior stroke colors or reinterpret them
  when a panel opens, when theme changes or when CanvasKit consumes them.
  No custom picker, alpha, eyedropper or wide-gamut UI. The browser-owned panel may expose its
  own eyedropper; the app neither promises nor reimplements it. Commit only native `change`,
  not transient picker preview; Cancel keeps accepted color. Unsupported/invalid return keeps
  prior setting and reports failure. Native panel layout/keyboard behavior is browser-owned.
  Swatch shows accepted color with contrasting border, accessible color text and no color-only
  availability state. Black defaults only on first creation, not every Resume.
- **History:** adjacent Undo then Redo buttons in the contextual row before width. Reuse current
  icon styling, minimum 44×44 CSS px targets, localized accessible labels/tooltips, actual native
  disabled state and Rust availability. The pair is always present even with empty history.
  Cmd+Z / Cmd+Shift+Z on macOS; Ctrl+Z / Ctrl+Shift+Z elsewhere are approved for this slice.
  No Ctrl+Y alias or global letter binding. Only handle when focus is in this editor's canvas
  or non-text chrome, not native fields, native panels, composition, gallery or sample previews.
  A handled unavailable command is not queued. Separate browser shortcuts remain browser-owned.
- **Canvas:** focusable named region with instructions and status association, not a global
  `role=application`. Primary mouse/pen contact draws; touch does not. Secondary/auxiliary buttons and
  context menus retain browser behavior. App pan/zoom uses the approved controls below; no
  app wheel/pinch/double-tap binding, barrel/eraser-end,
  Pencil squeeze/double-tap or tablet-button mapping is added. Native shortcuts emitted by an
  accessory follow the same focus guard. Pointer leaves canvas while captured: preserve actual
  input subject to bounds; pointer capture loss cancels. Offscreen geometry clips, not truncates.
  Keep browser touch handling on the canvas (`touch-action: auto`); do not cancel touch events
  or capture touch pointers for drawing. Do not reintroduce touch ink through compatibility
  mouse events; use the admitted pointer-event origin. Browser pan/pinch/navigation remains available where
  the browser supports it. These gestures are browser-owned, not Linefield canvas pan/zoom.
  Touch on native controls retains their normal behavior. Do not suppress contextmenu globally.
  Browser gesture takeover may cancel an active pen via pointercancel; mapping changes follow
  the existing remap cancellation contract. Do not promise uninterrupted ink during takeover.
- **Contact ownership (3A/4B):** first admitted primary mouse/pen contact owns the interaction;
  competing drawing pointers cannot preempt it or commit its stroke. Touch is never submitted
  as ink, but browser gestures remain able to interrupt the pen. No palm-rejection claim.
  Approved adapter rule: mouse pressure is absent, giving full constant width; pen uses its
  finite browser-reported effective pressure, including zero. Browser pressure is not proof
  of physical sensor capability: unsupported pen hardware may report 0.5 and consequently
  produce 55% width. The owner accepted this adapter limitation in 3A; there is no reliable
  sensor-detection claim or physical-device validation. Rust's 10%-to-100% pressure mapping
  remains unchanged. Unsupported axes are ignored, not fabricated. Matching pointerup
  ends, without an invented zero-pressure endpoint. Implementer verifies browser acquisition.
- **Ordering:** mouse/pen A begins, finger B touches/releases, A loses capture, mouse/pen C
  begins, A releases late: A cancels once; B never draws; C remains active until C ends/cancels
  or the browser interrupts it. B cannot directly end/cancel a different ink interaction;
  browser-generated cancellation of its owning pointer remains valid. Mapping and session
  generations reject stale coalesced samples. A range/picker interaction cannot create ink.
- **Escape/IME:** native dialog, field or composing text handles Escape first. On canvas Escape
  cancels active ink or the captured-base pan; idle Escape does nothing (no selection
  in scope), never navigates Back.
  Native text Undo/Redo/select/copy/paste remain native. No Save/Export binding is installed.
- **Focus/lifecycle:** entry retains current Back-first convention unless the user moved focus;
  canvas is reachable by Tab. Native control focus and native picker close restore their control.
  Pointerdown may focus canvas without scrolling. Tab order is Back, history pair, width, color,
  canvas, then Zoom out/Zoom in, skipping disabled controls; visual grouping and DOM reading
  order agree. A focused
  range scrolled out of the horizontal strip scrolls into view without moving artwork.
  Accepted Back returns to the visible New/Resume origin and restores gallery scroll. If layout
  switches desktop tile/compact action during navigation, focus its visible equivalent. Late
  animation/loader cannot steal deliberate focus; no hidden or inert control accepts input.
- **Accessible alternatives:** native ranges/buttons permit keyboard and assistive operation of
  settings/history/navigation. Touch can operate browser/native controls but cannot author ink
  in this slice; freehand authoring requires mouse/pen input. Keyboard
  drawing and equivalent nonvisual stroke authoring are explicit gaps, not silently approved
  feature additions. Screen-reader and physical assistive-input validation remains unrun.

## G1/P1 pan/zoom — approved web mappings

Pan/zoom belongs in this first slice. The owner approved these bounded web mappings as P1.
[Decision 17](../decisions.md) selects Space-drag/
scroll pan and gesture/menu zoom direction; the [input matrix](../input/platform-matrix.md)
leaves exact browser bindings for feature review. Keep 4B: finger gestures remain browser-owned.
Do not convert browser pinch into app zoom or intercept Ctrl/Meta-wheel, Ctrl/Cmd +/-/0, or
browser Back/Forward. The approved initial web mapping uses no app wheel handler, avoiding uncertain
trackpad pinch/scroll classification; trackpad click-and-drag works like a mouse.

- **Pan by drag:** when canvas owns keyboard focus, Space with no modifiers arms temporary
  pan; primary mouse/trackpad drag starts it if Rust is idle. Pen remains the selected tool;
  use grab/grabbing cursors without adding a Pan tool. Rust captures viewport and pointer
  base and derives every update from it. Release mouse or Space to finish; after Space-up
  while the pointer remains down, require pointer-up and a fresh begin before ink. Escape,
  blur, pointercancel/capture loss or route departure cancels and restores the pre-pan view.
  A system remap cancels first, then installs the new metrics. Clear the Space latch on blur,
  native field/IME takeover and cancel; a key held while an ink interaction rejects pan must
  be released and pressed again, never activate belatedly on pen-up. Key repeat cannot begin
  extra pan interactions. No inertia or animated camera movement.
- **Keyboard pan:** unmodified Arrow keys on the focused canvas move the view by 40 CSS px
  per native keydown, including eligible native repeat; no custom repeat timer or Shift
  multiplier. Right reveals content
  to the right (viewport center moves right, artwork moves left); Down reveals content below.
  Rust converts this view step using the accepted zoom, validates it and updates the mapping.
  Browser/native controls, IME and assistive command layers retain priority; no document-global
  Arrow handler. During active ink/pan, reject the app command without queueing or page-scroll
  fallback for this handled canvas action. A key rejected during ink/pan must be released and
  freshly pressed before any later step; held repeat cannot start moving on pen-up. Outside
  the focused canvas or with modifiers, Arrow behavior is native.
- **Zoom controls:** replace the static footer readout with Zoom out, localized current
  percentage, Zoom in. Both buttons use existing styling and ≥44×44 CSS px targets. Use
  a Rust-owned step action: multiply/divide by 1.25 and explicitly select the nearest endpoint
  if the step would cross 0.1 or 8. This button policy is not silent clamping of arbitrary
  invalid zoom arguments. Rust anchors each step at the drawable viewport center; no view
  math in TypeScript. Disable only the unavailable direction at 10%/800%; during ink/pan or
  unavailable rendering, both controls are unavailable. Keep the percentage noninteractive;
  no Fit, reset, preset menu, slider or extra keyboard chord is added.
- **State and interruptions:** app pan/zoom during a stroke rejects in Rust without cancelling
  ink, moving the view, altering history or queueing a later action. Navigation's own valid
  updates remain accepted. During an active pan, do not start ink or execute conflicting
  document/history/settings actions. Fresh input is required after end/cancel; stale old
  mapping/interaction events cannot draw or move the view. Browser touch/zoom can still
  produce system remaps/cancellation; that is distinct from rejected app navigation.
- **Viewport lifetime (P1):** retain the accepted viewport center/zoom with the same
  temporary RAM drawing across gallery visits, as separate viewport state rather than artwork.
  P1 explicitly approves this retention. New starts at world origin/100%;
  no automatic recentering on Resume. Pan/zoom never changes original stroke geometry/color,
  content revision or Undo/Redo position and is not restored by document Undo/Redo.

Exact named calls, pan cancellation state, regional mapping and zoomed precision/admission
belong to the Rust amendment. Prior fixed-zoom numerical experiments do not establish this
expanded range. Obtain that evidence and review alongside these mappings before code. The
new controls require real layout/focus/keyboard review; explicit controls provide accessible
zoom and focused Arrow keys provide keyboard pan without claiming full nonvisual authoring.

## Visual checklist and adaptive layout

Use existing semantic theme roles, typography, spacing, separators, 8 px rounded controls and
Pen selected treatment. Keep rail order Pen/Select/Eraser/Line/Shapes/color; unavailable tools
are visibly disabled and labeled as such. No wheel, submenu or custom settings page. Pen's
selected state uses both shape and `aria-pressed`, not color alone. Fixed opacity/smoothing
become readable noninteractive labels in their existing groups; do not retain working sliders
that suggest unavailable editing. Header still contains Back, centered temporary title and
unavailable Settings. Preserve sample-screen composition separately.

Resume uses the existing New origin and card geometry. Its longer en/uk label wraps inside
the tile without growing the gallery row. The compact action has max-width equal to viewport
minus safe-area/outer margins, with wrapping and a ≥44 px target; it must not overflow 320 px
or rely on a tooltip for its meaning. Reserve gallery bottom scroll clearance for its actual
height at large text so the last card/ellipsis stays reachable. Update that clearance without
resetting the gallery scroll anchor or rebuilding the temporary document.

The contextual row orders Undo/Redo, width/value/pictogram, fixed Opacity 100%, Smoothing Off.
At constrained widths its horizontal overflow preserves all controls and focus; no icon-only
hidden history menu. Reserve only a compact disclosure/footer band below the drawable viewport:
two short complete statements about unsaved lifetime/history, the zoom button/readout group
and a visible concise pan hint. The hint names Space-drag and canvas-focused Arrow keys;
it is not available only through a tooltip. These new controls/hint need fresh sizing evidence.
The statements wrap naturally in their locale at entry; they are visible copy, not tooltips.
Do not permanently reserve an empty error panel or blank Retry row. Loading/errors use a
bounded overlay inside the already-sized canvas, above ink and below the header/context.
The overlay never moves the drawable origin or resizes the canvas. It has readable surface,
border, localized message and applicable ≥44 px Retry button, with max-height 50% of the
drawable rectangle and overflow scrolling; if that cannot fit an action, use the entire
otherwise unavailable canvas area. Loading/fatal/surface-unavailable states admit no ink.
After a cancelled-stroke warning, a fresh admitted contact outside the overlay clears that
warning before starting; the overlay itself never produces ink. Back remains separate and
reachable. Errors do not replace or conceal the lifetime/history statements.

Disclosure sizing evidence is **stale for the revised 1A/2A wording**. The lead-run headless
Chrome 155.0.8059.80 text-metric probe on 2026-10-19 measured the former history-clearing
disclosure. Its line counts, heights and derived canvas-space estimates do not certify the
current en/uk text. It was not rerun for this amendment. The ignored raw result remains at
`.build-cache/web-memory-design/text-metrics.json`; it is neither current layout evidence nor
application E2E, native evidence or visual approval. Current copy must be measured afresh.

The S4 adaptive space rule remains: cap the footer at one third of viewport height and make
overflow keyboard-scrollable, with the not-saved opening initially visible; use a smaller cap
if needed to retain a 44×44 CSS px admitted ink area. The zoom group and pan hint follow the
disclosure, wrap independently and belong in actual footer measurement, including 44 px
button height and focus outlines. No earlier readout-only measurement establishes their fit.
At short landscape/200%, actual row heights/safe areas may make drawing unavailable. Preserve
Back and scrollable controls and show the size state when the minimum admitted ink area cannot
fit. This threshold protects a basic target, not a performance or universal minimum-window
guarantee. Revised en/uk copy, DOM wrapping, pseudo-expansion, fallback fonts, scrollbar effects
and context-row height remain required runtime checks; no fit claim is carried over.

Define the actual drawable rectangle between header/context, rail and footer; chrome never
receives ink. New starts centered on world origin at zoom 1. Rust owns the current regional
viewport center and zoom in [0.1,8]; accepted pan/zoom changes the mapping, never stored
artwork. Resize preserves the accepted viewport center/zoom while changing visible extent
after cancelling unfinished ink or pan. Actual coordinate mapping and admissible
surface sizes follow the companion contract. Resize/DPR/orientation/keyboard-induced mapping
change cancels active stroke before installing the new generation. Native browser zoom remains
available; it is not a document zoom command. Offscreen completed ink remains in RAM.

Keep existing rail widths (72 CSS px, 56 at ≤600), header sizing and safe-area treatment. At
large text or short height, rail/context/status scroll independently; targets stay ≥44 CSS px.
If chrome leaves no admitted drawable rectangle, show size-unavailable state, keep Back and
scrollable controls reachable, and never show a tiny canvas as usable. Window resizing must
preserve control identity, settings, document, gallery anchor and focused target. This is a
content/space rule, not a tablet/phone name rule. Reconcile measured boundaries before coding.

Light/dark chrome follows system. Fixed light artwork and literal sRGB strokes never change
with theme or RTL. In forced colors use system Canvas/CanvasText, visible border and focus
outline for chrome; preserve artwork pixels with an explicit canvas treatment and a visible
boundary. The selected Pen and disabled controls remain distinguishable without transparency.
Check text contrast and focus contrast from actual output; token names are not contrast proof.
RTL pseudo-layout uses logical ordering for chrome and isolated mixed-script labels; canvas
X-right/Y-down, points, swatches and artwork never mirror. No live locale selector.

## Motion and status timing

Keep existing gallery/surface travel duration/easing tokens and New-origin geometry; no new
animated pen effect. A retained drawing has no gallery thumbnail: do not compress ink into a
fake card on return. Hide the ink presentation at accepted departure and transition the empty
New/Resume surface; retain the Rust document independently. Resuming reveals accepted ink when
surface ready, without stroke replay. Review this narrow transition difference against v2.

Transient ink follows accepted actual input without tweening, delay or smoothing. History,
settings, app pan/zoom, cancellation and error states settle immediately; no camera tween,
inertial pan or new animated progress indicator. Reduced motion keeps the same direct viewport
updates and cancellation semantics.
Reuse existing reduced-motion path with instant semantic state/focus and no travel. Preference
change/resize during travel settles the newest accepted presentation. Never clear history or
release RAM in an animation callback. Navigation destination semantics complete before its
visual enhancement; hidden outgoing chrome is inert. Back remains an operable cancellation
path during initialization. Announce destination/error once; avoid per-sample or per-frame AX.

## Proposed exact English/Ukrainian resource copy

Stable IDs are proposed additions to separate trusted data-only catalogues, not implemented
resources. Existing labels such as Pen/Width/Back remain. Typed arguments are named. Ukrainian
wording requires a proficient contextual review; this author does **not** claim linguistic
approval. Temporary means page-memory lifetime, not a durable draft. Undo wording names the
last action to distinguish it from Cancel; retain gallery's existing labels independently.

| Semantic ID | English | Ukrainian proposal |
| --- | --- | --- |
| memory.title | Temporary drawing | Тимчасовий малюнок |
| memory.resume | Resume temporary drawing | Продовжити тимчасовий малюнок |
| memory.lifetime | Not saved. Lost on reload or tab close. | Не збережено. Перезавантаження чи закриття вкладки призведе до втрати малюнка. |
| memory.historyLifetime | Back keeps the drawing and Undo/Redo history. | Назад залишає малюнок та історію скасування й повторення дій у пам’яті. |
| memory.retained | Temporary drawing is only in this tab’s memory. Reloading or closing the tab loses it. | Тимчасовий малюнок є лише в пам’яті цієї вкладки. Перезавантаження або закриття вкладки призведе до його втрати. |
| memory.loading | Preparing drawing… | Підготовка малюнка… |
| memory.loadFailed | Drawing could not start. Try again. | Не вдалося підготувати малюнок. Спробуйте ще раз. |
| memory.retry | Retry | Повторити спробу |
| memory.tools | Drawing tools | Інструменти малювання |
| memory.toolUnavailable | {tool} · unavailable in this version | {tool} · недоступно в цій версії |
| memory.undo | Undo last action | Скасувати останню дію |
| memory.redo | Redo last action | Повторити останню дію |
| memory.undone | Stroke undone. | Штрих скасовано. |
| memory.redone | Stroke redone. | Штрих відновлено. |
| memory.color | Pen color | Колір пера |
| memory.colorValue | Pen color: {color} | Колір пера: {color} |
| memory.colorRejected | Color could not be changed. The previous color is kept. | Не вдалося змінити колір. Залишено попередній колір. |
| memory.widthRejected | Width could not be changed. The previous width is kept. | Не вдалося змінити товщину. Залишено попередню товщину. |
| memory.opacityFixed | Opacity 100% · fixed | Непрозорість 100% · незмінна |
| memory.smoothingOff | Smoothing Off | Згладжування вимкнено |
| memory.zoomOut | Zoom out | Зменшити масштаб |
| memory.zoomIn | Zoom in | Збільшити масштаб |
| memory.zoomValue | Zoom: {percent} | Масштаб: {percent} |
| memory.panHint | Pan: Space + drag, or Arrow keys when the canvas is focused. | Переміщення полотна: пробіл і перетягування або клавіші зі стрілками, коли полотно у фокусі. |
| memory.viewRejected | The view could not be changed. The previous view is kept. | Не вдалося змінити вигляд полотна. Залишено попередній вигляд. |
| memory.canvas | Temporary drawing canvas | Полотно тимчасового малюнка |
| memory.instructions | Draw with a mouse or pen. Touch gestures stay with the browser. Escape cancels the current stroke. This drawing is not saved. | Малюйте мишею або пером. Жести дотику обробляє браузер. Escape скасовує поточний штрих. Цей малюнок не зберігається. |
| memory.strokeCancelled | Current stroke cancelled. | Поточний штрих скасовано. |
| memory.strokeRejected | This stroke exceeded the drawing limits and was cancelled. Earlier strokes are unchanged. | Цей штрих перевищив обмеження малювання, тому його скасовано. Попередні штрихи не змінено. |
| memory.inputRejected | This stroke could not be accepted and was cancelled. Earlier strokes are unchanged. | Цей штрих не вдалося прийняти, тому його скасовано. Попередні штрихи не змінено. |
| memory.capacity | This stroke could not be completed and was cancelled. Earlier strokes are unchanged. | Цей штрих не вдалося завершити, тому його скасовано. Попередні штрихи не змінено. |
| memory.capacityBegin | A new stroke could not start. Earlier strokes are unchanged. | Не вдалося почати новий штрих. Попередні штрихи не змінено. |
| memory.historyLimited | Older Undo steps are no longer available. Your drawing is unchanged. | Давніші дії більше не можна скасувати. Малюнок не змінено. |
| memory.displayLost | Drawing display is unavailable. Your drawing remains in this tab’s memory. | Відображення малюнка недоступне. Малюнок залишається в пам’яті цієї вкладки. |
| memory.resourceUnavailable | The drawing could not be displayed. Completed strokes remain in memory and are not saved. | Не вдалося відобразити малюнок. Завершені штрихи залишаються в пам’яті й не збережені. |
| memory.retryDisplay | Retry display | Відновити відображення |
| memory.sizeUnavailable | This window size cannot display the drawing. Resize the window; your drawing remains in memory. | За цього розміру вікна малюнок неможливо відобразити. Змініть розмір вікна; малюнок залишається в пам’яті. |
| memory.fatal | Drawing stopped after an internal error. This temporary drawing cannot be recovered here. | Малювання зупинено через внутрішню помилку. Цей тимчасовий малюнок тут неможливо відновити. |
| memory.unavailable | The temporary drawing is unavailable. It was not saved. | Тимчасовий малюнок недоступний. Його не було збережено. |
| memory.navigationUnavailable | Navigation could not finish. Your drawing remains in this tab’s memory. | Не вдалося завершити перехід. Малюнок залишається в пам’яті цієї вкладки. |
| memory.resumed | Temporary drawing resumed. Undo/Redo history is kept. | Тимчасовий малюнок продовжено. Історію скасування й повторення дій збережено в пам’яті. |

Error selection uses stable typed outcomes; never parse English Rust text. `{tool}` is a
localized app-owned tool label and `{color}` is validated opaque sRGB text, not raw user input.
`{percent}` is the accepted Rust zoom formatted using the independent browser region.
Use `memory.capacity` only when `activeCancelled=true`; rejected Begin without an interaction
uses `memory.capacityBegin`, never claiming that a stroke was cancelled.
Neither capacity message nor `memory.resourceUnavailable` represents soft-target excess.
Use them only for the matching actual failure/validated rejection; do not show a target-based
lockout or assert that a still-usable drawing can never resume in this tab.
Numbers/percentages use independent browser regional formatting; the table's 100% conveys
meaning, not permission to hardcode formatting. Resource/layout/runtime/linguistic approval
remain four distinct checks. No count/plural message is needed by this scope.

## Owner-approved R1 presentation mechanism

The owner approved R1 at51d9345 on2026-10-19: coherent full-frame staging and Rust
acknowledgement before fresh ink after a mapping/content change. This specifically approves
the readiness/presentation addition below; it does not accept arbitrary freezes or waive
measured interaction requirements. Reuse memory.loading in the existing fixed canvas overlay while
the prior coherent image is retained. Mark canvas busy; preserve focus and unsaved disclosure.
No modal, layout shift, fake progress percentage, failure wording or Retry during normal rebuild.
Back, pan/zoom and cancel remain operable. Rejected ink requires release and a fresh contact
after current publication/acknowledgement. Actual failure uses D3-09 recovery messaging.

Designer reviewed this proposal on2026-10-19. Measure pan feedback and time to new ink on
cold/warm/evicted scenes and long strokes; continuous supersession must not be disguised as
responsive pan. Bounded pages do not bound full-stroke rendering time. If measurements fail,
return a concrete alternative for review rather than silently adding tiles/workers or weakening
interaction expectations. This section records the approved technical presentation amendment, not a
reopening of approved S1–S4 composition and lifecycle choices.

## Observable acceptance and evidence ownership

All rows below are **planned, unrun** against the new engine/design. Existing v2 browser results
are regression context only. Web implementer owns real browser E2E actions and failure fixtures;
Rust specialist owns semantic expectations, designer combined UI review, lead exact evidence,
and fresh reviewer independent assessment. E2E-only owner policy supersedes older unit/core/
bridge-suite wording. Numerical experiments are analysis, not browser/physical-device evidence.

| Proposed test ID / scenario mapping | Trigger, visible outcome and invariant | Required evidence |
| --- | --- | --- |
| WMP-01A / DRAW-001; CT-01/02/06, INV-01/02/04, SU-02/03/04 | New, brief mouse/pen contact, pressure/constant-width stroke, duplicate point and sharp turn; complete round ink then one-step Undo/Redo. Earlier settings remain attached to earlier strokes. | Real app/Rust/Wasm/CanvasKit mouse E2E plus visible captures; explicitly labeled injected pressure lane, physical pen gap. |
| WMP-01B / CT-01/09, INV-05/11, SU-07/20 | Width 1/8/512, keyboard and pointer change/cancel; native color change/cancel, invalid return, active-stroke rejection. Correct accepted value and next-stroke appearance. | Native range actions; browser color-panel controllability limitation and separate actual panel evidence. Directly setting DOM value is not picker interaction proof. |
| WMP-02A / DRAW-CANCEL-001, FOCUS-001; CT-02/03, INV-03/04 | Escape/blur/hidden/capture loss/remap cancel whole transient ink; mouse/pen A, finger B, mouse/pen C, late A sequence rejects stale input. Touch produces no stroke/history and keeps browser gesture handling. Browser takeover can cancel the owning pen; foreign pointer events cannot. Repeated cancel is harmless. | Browser lifecycle/input and touch-emulated E2E with labeled injected conditions; before/after artwork/history and native control interaction. Physical touch/pen coexistence and browser gesture takeover remain separate device gaps. |
| WMP-02B / CT-02/06, INV-04/08/11, SU-14/16 | Resize, backing-density change, orientation and virtual keyboard while active cancel once; idle resize preserves world content/settings/history. | Real resize E2E plus synthetic DPR/keyboard fixtures; hardware transition gap separately. |
| WMP-03A / HISTORY-SESSION-001 (memory subset), FOCUS-001; INV-04/05 | Buttons and scoped shortcuts undo/redo, active stroke blocks them; field/IME keeps native commands; settings create no history. | Actual focus/key E2E; physical IME and screen-reader gap. |
| WMP-10 / CT-03/08, INV-01/04, SU-13 | Back retains ink/settings, both Undo/Redo stacks and history position; Resume/Forward uses a fresh editing attachment without a history reset. Undo-all → Back → Resume → Redo restores the same strokes. Rapid traversal/stale loader/failed target cannot corrupt retained state; old-session input rejects. Samples and Reset samples preserve the temporary owner/history. | Browser history/Back/Forward, short/long transition and reduced-motion E2E, gallery focus/scroll assertions; resumed Undo/Redo controls and visible exact artwork. |
| WMP-11 / NAV-001, INPUT-02/06; CT-01/02/03/06, INV-01/04/05/08/11, SU-07/08/14 | Approved Space-drag/Arrow pan and zoom buttons preserve artwork/history, center anchor and 10%–800% bounds. Space-up while mouse held cannot become ink; pan → resize → late pointerup cannot restore old mapping. Active ink rejects view requests with no delayed movement after End; held/repeated keys require fresh eligible activation. Back/Resume retains the accepted center/zoom. Native field/IME and browser/touch zoom remain native. | Real control/key/mouse E2E, regional boundary and visible anchor assertions, endpoint/cancel/focus cases; real trackpad/browser gesture and assistive-input gaps labeled separately. Expanded numerical evidence must precede implementation. |
| WMP-04 / REG-PREC-01/04/06; CT-02/04, INV-03 | Approved finite/numerical boundary fixtures exercise real app intake; current malformed/over-limit batch cancels only current stroke. | Reviewed isolated fixture path; exact coordinates stay out of normal logs; visible prior artwork and eligibility checked. |
| WMP-05A / SEC-02/03/13; CT-04/06, INV-08/09 | Asset failure/retry/back race, capacity and oldest-history boundary preserve completed ink, no silent owner replacement. One newest stroke exceeding 16 MiB remains one Undo/Redo operation; failed/cancelled edits and navigation retire nothing. | Fault E2E and actual messages; production artifact excludes fault controls. |
| WMP-12 / NAV-001; CT-03/08, INV-01/04, SU-13 | Completed or redoable artwork requests a best-effort native reload/close warning in editor or gallery; an empty owner without redo does not. Browser-confirmed departure may lose RAM; same-page Back/Resume does not prompt. A cold temporary URL returns gallery/unavailable. | Browser E2E for handler eligibility, supported native dialog and route behavior; unsupported/suppressed warnings and mobile lifecycle gaps explicitly recorded. No guarantee that browser/OS termination emits a warning. |
| WMP-05B / CT-03/06, INV-01/08 | Soft CPU/graphics excess with successful allocations continues editing after disposable cleanup; actual display allocation failure/context loss permits bounded explicit Retry with the same owner/history. Back/Resume cannot silently replace it. Fatal engine failure disables editing and discloses unrecoverability; reload temporary route returns gallery unavailable. | Separately labeled target/actual-resource/renderer/engine fault lanes, reload and cold URL E2E; no hard-target enforcement or crash-recovery claim. |
| WMP-06 / I18N-LAUNCH-002, I18N-UK-002; CT-09, INV-11, SU-17/20 | en/uk, fallback, region independence, pseudo-expanded/RTL/mixed script, full focus traversal; clear lifetime/error/disabled states, unchanged artwork. | Built-app locale/layout E2E, reviewed captures and accessibility semantics; proficient Ukrainian review separately. |

Required visual capture configurations: 320×700 minimum target, 390×844 compact, 600/601 and
639/640 width boundaries, 740×320 short landscape, 768×1024 and 1024×768 orientation pair,
1280×900 typical, 1920×1080 wide, 2560×1440 maximum review sample. These are review samples,
not universal canvas limits; oversize/undersize follow Rust surface admission. Exercise continuous
resizing between samples, DPR 1/2 plus admitted backing boundary, browser zoom/text 100%/200%,
virtual keyboard inset, safe areas, light/dark/forced colors and normal/reduced motion. At least
320/740/1280 include both real en/uk and enlarged content; pseudo-expansion/RTL/mixed-script
cover narrow and typical. Capture blank/ink/active/Undo-disabled, fixed unsupported controls,
loading/failure/capacity/context-loss/fatal/retained-gallery and focus indicators where suitable.
Keep synthetic drawing colors/pixels consistent across themes; compare actual rendered strokes
with approved geometric tolerance separately from chrome screenshot tolerance.

An implementer records the selected pairwise matrix, rationale for uncaptured combinations,
exact build/browser/OS/device/source/fixture and discovered E2E IDs before claiming coverage.
Do not claim this list is exhaustive. Use synthetic drawings only; captures/results live in
ignored `.build-cache` or review attachments. A screenshot does not establish AX, motion,
physical pressure, performance, memory safety or durable recovery. No foreground automation,
new accounts, external design connector or private upload is authorized here.

## Host mapping and review gaps

Web maps controls to semantic HTML/native range/color panel, browser history/focus and CanvasKit
presentation. macOS later maps the same intent to AppKit controls/native color panel, Swift
input and Rust commands with Skia; no implementation or color-control replacement is approved
by this web packet. UIKit/Compose/WinUI/GTK retain host text/IME/AX/input and common Linefield
styles in their future reviewed designs. Size and input capability govern adaptation; tablet
portrait/landscape and narrow desktop split windows share the same rules. TV/watch remain
view-only; this task adds no editing affordance for those hosts. XR remains separately scoped.

Feasibility supplied here: source inspection of the integrated web shell, routing, range,
color placeholder and en/uk resources; coordinated Rust proposal for width/defaults, settings,
pressure, mapping, memory and faults. No running v3 artifact, screenshot baseline, physical
hardware, native specialist approval, screen-reader session or measured performance exists.
Lead obtains scoped browser/rendering feasibility and independent review before marking the
packet ready. Proficient Ukrainian review and exact browser-native color-panel evidence remain
identified implementation prerequisites, not self-certified approval. The selected composition
is reused; no new competitor feature or research claim is introduced.

Security design consequence: unsaved strokes are private RAM content. Diagnostics/announcements
must not serialize geometry or user content; normal logs use bounded state/reason metadata.
No upload, telemetry, clipboard write, storage consent or fake permission prompt is added.
Technical controls and negative tests belong to engineers/reviewer; this document specifies
truthful visible outcomes only. P1/H1/S1–S4 design choices are approved. Stop at this review
packet until remaining technical decisions are resolved and the next product task is confirmed;
design approval is not permission to start an unconfirmed implementation task.
