# In-memory web pen — drawing screen amendment v3

Status: **proposal for owner approval; no product implementation or visual acceptance**.
Task: [S02-W01](../../tasks/S02-W01.md), confirmed first on 2026-10-19, including bounded
synthetic numerical experiments. Base: integrated `8dbd9b1` (PR #7). Design identity:
`WMP-D3`, states `D3-01`–`D3-12` below, together with this file's final PR revision/hash.
The lead records that exact snapshot when requesting approval. A mutable link is insufficient.

This narrow amendment extends the [selected drawing screen](drawing-screen.md), whose reference
hash is `5e0bde75591c868d12c0548ce916c746d5d8918ea430c38a19f203da4d341123`.
It keeps the slim left rail, contextual top row, gallery, sample previews and shared Linefield
styles. It proposes real pen behavior only for the existing blank New entry. Its companion
[contract packet](../interfaces/web-memory.md) owns exact types, numerical limits, geometry,
resource accounting and fault dispositions. Neither document approves the other implicitly.

## Approval items and recommendation

Approve the following as one identified screen/lifecycle amendment, separately from the exact
engine contract. P05-E01 and P05-E02 each still require their own scope/position confirmation.

1. Retain **one temporary Rust document in this page's memory** across accepted gallery returns.
   Successful departure ends Undo/Redo history; resuming starts fresh history. Keep completed
   ink and accepted pen settings. No library record, thumbnail, automatic persistence or recovery.
2. While that document exists, replace both existing desktop New and compact floating New
   actions with **Resume temporary drawing**. Change their plus pictogram to the existing Pen
   pictogram; retain position and target. The action never silently starts a replacement. No
   second temporary drawing, clear/reset command, extra gallery tile or launch restoration.
3. Show an always-visible not-saved disclosure in the editor, plus a gallery disclosure when
   retained. Explicitly explain reload/tab-close loss and history ending on gallery departure.
4. Enable only Pen, width, color and session Undo/Redo. Other tools remain visible but unavailable;
   opacity is fixed at 100%, smoothing is Off, zoom is a noninteractive 100% readout.
5. Use the browser-owned opaque sRGB color input, the existing width range expanded to 1–512
   with default 8, and explicit Undo/Redo controls and scoped keyboard shortcuts below.

The smaller alternative is New-always-blank with a Stay / Leave without saving confirmation
before destroying completed work. It needs an extra destructive-navigation decision and prompt,
and makes routine Back destructive. Recommendation: retention above, with no discard prompt for
an ordinary in-app Back. Do not implement a blend of these alternatives. Reload remains the
browser's action, never the app's suggested capacity remedy while usable RAM content exists.
This same-page Resume is not automatic launch restoration or the durable Continue feature
excluded by decision 19. No storage decision is reopened or made a prerequisite.

## User goal, authority and routes

Goal: open New, make visible solid round strokes with chosen width/color, cancel an unfinished
stroke and undo/redo completed strokes. The drawing is visibly temporary. Existing sample-card
names, gallery rename/removal behavior and preview artwork remain as in the integrated build.
Samples do not become imported/editable documents. The existing sample preview disclosure
remains, and its controls retain their current prototype-only semantics; the new real Undo/Redo
pair is not shown for samples. Opening a sample while the temporary document is retained leaves
that document alone. The existing Reset samples action never releases the temporary document.

Rust owns document/interaction/history/settings/capability state. Browser code acquires events,
performs native event-to-element conversion, hosts native controls and presents accepted Rust
projections. It does not compute world points, pressure geometry, edit policy or a second model.
One temporary identity and one active session come from Rust; URLs grant no authority.

Keep `/` and existing `/drawing/<sample-id>` routes. Reuse `/drawing/preview-new` for the
same-page temporary editor; its historical spelling is an implementation detail. Accept it only
with a live temporary owner or an explicit New request. On cold direct entry/reload, replace
that route with `/` and announce temporary drawing unavailable; never silently show a new blank
as recovered content. New from the gallery is the only initial creation intent. Same-page
Forward to the temporary route resumes retained content with a new history session. Back to a
sample remains a preview. Validate unknown routes through the existing safe gallery fallback.

Departure ordering is narrow and explicit. Prepare the destination's inert shell and validate
its availability before leaving; perform any fallible history write before calling Rust Leave.
Back requests browser traversal, then waits for actual `popstate`; a Back click without a
traversal event does not clear history. On `popstate` the browser has already selected its
entry, so no synthetic duplicate entry is pushed. Recheck the latest route-request generation
immediately before synchronous Leave, with no await between that check and the command.
An obsolete request does nothing and reconciles the newest one. Only accepted Leave is the
semantic departure; switch to the prepared destination, then run optional motion. A later
animation/display failure settles that destination or its unavailable state, never restores
old history. Initialization/history-write failure before Leave preserves the accepted session.
If Leave unexpectedly rejects with usable authority, retain the accepted editor and show
navigation unavailable; attempt one generation-guarded URL reconciliation to its accepted
route. Browser history rollback is not guaranteed, and no traversal loop or automatic retry
may pretend it is. A reconciliation failure keeps editing suspended and Back available.
If authority is fatal, use D3-10; Back changes host presentation while keeping the tombstone,
without invoking unsafe Rust commands or claiming a successful semantic history operation.

No special unload prompt is recommended: there is no reliable recovery behind it. The disclosure
is present before first ink. Browser reload/close/origin navigation may lose RAM; no saving,
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
| D3-02 Initializing | Wasm and CanvasKit/surface become ready for current request | Fresh creation enters D3-03 blank editor; selected Pen, width 8, opaque black, empty history. Resume preserves ink/settings as D3-05 specifies. Loading has no fake percentage or decorative minimum delay. Back can cancel entry. Late completion after Back is released, never reopened. |
| D3-03 Ready, empty or completed ink | Admitted primary contact on canvas, idle, surface ready | D3-04 active stroke with captured Rust settings/mapping/identity. An empty ready canvas needs no instructional modal. |
| D3-04 Drawing | Ordered actual samples, then matching end | One complete round stroke, one history operation; D3-03. Tap gives a dot. Duplicate-position/pressure behavior follows exact Rust geometry contract. No prediction, filtering, tilt or opacity behavior. |
| D3-04 Drawing | Escape, window blur, hidden page, pointer cancellation/capture loss, navigation request or mapping invalidation | Cancel current interaction before transition/remap. Remove its entire transient stroke, preserve completed ink/settings; reject late input. Preserve history until successful semantic departure, then clear it as in D3-03. Remain D3-03 unless navigating or unavailable. No half-stroke commit. |
| D3-04 Drawing | Undo/Redo, tool/style change, competing pointer | Rust rejects conflicting command; no queue, forced finish or settings mutation. Availability visibly disabled. Foreign pointer cannot finish/cancel the owner. |
| D3-03 Ready | Accepted Back or same-page departure | Cancel transient field adjustment; end history only at successful semantic departure; D3-05 gallery retains document and settings. Failed/cancelled destination keeps old session/history. Show history explanation before departure, not as a surprise afterwards. |
| D3-05 Gallery with retained document | Resume or valid same-page Forward | D3-02 if surface rebuild needed, then D3-03 with retained ink/settings and empty history. Gallery focus/scroll survive. Resume remains available after sample navigation. |
| D3-06 Initialization failure | Asset/runtime/surface fails before usable entry | Localized error overlay within the canvas area, Retry and Back. Retry only the failed idempotent initialization stage; current request token required. Never claim drawing recovered. |
| D3-07 Rejected stroke/capacity | Current batch violates finite/envelope/queue/sample/memory admission | Cancel only its unfinished stroke; existing ink/history preserved. Show specific localized reason once per event, no per-sample announcement. Subsequent fresh stroke allowed only if Rust reports admission available. |
| D3-08 History retention boundary | Accepted whole-operation eviction by Rust | Existing ink remains; Undo availability matches retained operations. Announce oldest Undo steps unavailable once per eviction episode. No pretend unlimited history. A failed edit cannot secretly evict history. |
| D3-09 Surface unavailable | Context loss or backing-size admission failure with Rust owner usable | Cancel transient input, suspend canvas drawing; preserve document/history. Show Retry display for context loss; size failure asks to resize the window. Rebuild from accepted RAM scene, not host copies. Renderer errors never reset document. |
| D3-10 Fatal engine failure | Wasm trap/poison or unusable authority | Fail closed; disable edits/history/settings. Keep last completed image only if safely available, visibly marked unavailable. Explain RAM cannot be recovered here. Back remains available; no Retry that silently replaces owner/content. |
| D3-11 Temporary content unavailable | Cold temporary URL or missing owner after page restoration | Gallery, unavailable announcement, New available. Do not claim previous content intact, saved or recoverable. |
| D3-12 Preview | Open existing raster sample | Existing non-editable sample screen; no pen intake/history command. Return preserves temporary owner if present. |

If a fatal owner still exists, Resume opens D3-10, never allocates a blank replacement. Only a
fresh page begins a new lifetime. Back from D3-10 returns gallery without a false retained-work
promise: gallery shows the fatal explanation instead of the ordinary retention disclosure.
When allocation fails before any owner was created, gallery keeps New. The Rust packet must
expose this distinction; host code may not infer it from a rendered blank canvas.
An owner with zero strokes still counts as retained: Undo-all, cancelled first stroke and
enter-then-Back retain the same temporary identity/settings, title and Resume label. Do not
infer disposal or replacement from an empty image. Undo-all followed by Redo works until an
accepted departure; after departure the blank retained drawing resumes with empty history.

## Controls, inputs and focus

- **Width:** native HTML range, integer step 1, 1–512, initial 8, localized visible numeric value
  and accessible value. Arrow/Home/End/Page keys use native range behavior. Host-local drag is
  an uncommitted field adjustment; on change/end submit one validated settings replacement.
  Escape, pointer cancel, blur or navigation abandons uncommitted adjustment and restores the
  last accepted value. A rejected command also restores accepted value; no delayed replay.
  Do not add a numeric text field or new curve/preset control. The icon sample is an illustrative
  pictogram, not a second stroke renderer. Accepted setting affects only subsequent strokes.
- **Color:** existing round rail position hosts a labeled native `input type=color`; opaque
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
  Cmd+Z / Cmd+Shift+Z on macOS; Ctrl+Z / Ctrl+Shift+Z elsewhere are proposed for this slice.
  No Ctrl+Y alias or global letter binding. Only handle when focus is in this editor's canvas
  or non-text chrome, not native fields, native panels, composition, gallery or sample previews.
  A handled unavailable command is not queued. Separate browser shortcuts remain browser-owned.
- **Canvas:** focusable named region with instructions and status association, not a global
  `role=application`. Primary mouse/pen/touch contact draws; secondary/auxiliary buttons and
  context menus retain browser behavior. No wheel, pan, zoom, double-tap, barrel/eraser-end,
  Pencil squeeze/double-tap or tablet-button mapping is added. Native shortcuts emitted by an
  accessory follow the same focus guard. Pointer leaves canvas while captured: preserve actual
  input subject to bounds; pointer capture loss cancels. Offscreen geometry clips, not truncates.
  Apply `touch-action: none` to the actual drawing canvas only: direct manipulation there is
  drawing, so a later contact cannot become browser pan/pinch. Do not apply it to document,
  gallery, chrome or native controls; browser-owned zoom controls remain available. Do not
  suppress contextmenu globally. A browser/system takeover still cancels via pointercancel.
- **Contact ownership:** first admitted primary contact owns interaction; later contacts cannot
  preempt it, navigate or cause a commit. No automatic palm-rejection claim. Proposed web
  adapter rule: mouse and touch pressure are absent, giving full constant width; pen uses its
  finite browser-reported effective pressure, including zero. Browser pressure is not proof
  of physical sensor capability: unsupported pen hardware may report 0.5 and consequently
  produce 55% width. This limitation needs owner approval as part of the adapter contract;
  there is no reliable sensor-detection claim. Rust's selected 10%-to-100% pressure mapping
  remains unchanged. Unsupported axes are ignored, not fabricated. Matching pointerup
  ends, without an invented zero-pressure endpoint. Implementer verifies browser acquisition.
- **Ordering:** pointer A begins, B touches/releases, A loses capture, C begins, A releases late:
  A cancels once; B has no authority; C remains active until C ends/cancels. Mapping and session
  generations reject stale coalesced samples. A range/picker interaction cannot create ink.
- **Escape/IME:** native dialog, field or composing text handles Escape first. On canvas Escape
  cancels active ink; idle Escape does nothing (no selection in scope), never navigates Back.
  Native text Undo/Redo/select/copy/paste remain native. No Save/Export binding is installed.
- **Focus/lifecycle:** entry retains current Back-first convention unless the user moved focus;
  canvas is reachable by Tab. Native control focus and native picker close restore their control.
  Pointerdown may focus canvas without scrolling. Tab order is Back, history pair, width, color,
  canvas, skipping disabled controls; visual grouping and DOM reading order agree. A focused
  range scrolled out of the horizontal strip scrolls into view without moving artwork.
  Accepted Back returns to the visible New/Resume origin and restores gallery scroll. If layout
  switches desktop tile/compact action during navigation, focus its visible equivalent. Late
  animation/loader cannot steal deliberate focus; no hidden or inert control accepts input.
- **Accessible alternatives:** native ranges/buttons permit keyboard and assistive operation of
  settings/history/navigation. Freehand authoring still requires a pointer-capable input; keyboard
  drawing and equivalent nonvisual stroke authoring are explicit gaps, not silently approved
  feature additions. Screen-reader and physical assistive-input validation remains unrun.

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
two short complete statements about unsaved lifetime and history, plus the fixed zoom readout.
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

Space tradeoff: a lead-run headless Chrome 155.0.8059.80 text-metric probe on 2026-10-19 used
these exact two catalogue sentences, system-ui at 12/24 px, 1.4 line-height, word wrapping,
16 px vertical padding and available width = viewport − rail − 32 px. It measures text and
computes wrapping; **it is not application layout, E2E, native evidence or visual approval**.
The raw local result is ignored `.build-cache/web-memory-design/text-metrics.json`.

| Viewport width / text scale | English disclosure lines / height | Ukrainian disclosure lines / height |
| --- | --- | --- |
| 320 / 100% | 3 / 67 px | 5 / 100 px |
| 320 / 200% | 5 / 184 px | 9 / 319 px |
| 740 / 100% | 2 / 50 px | 2 / 50 px |
| 740 / 200% | 2 / 84 px | 4 / 151 px |
| 1280 / 100% | 2 / 50 px | 2 / 50 px |
| 1280 / 200% | 2 / 84 px | 2 / 84 px |

Therefore cap the footer at one third of viewport height and make overflow keyboard-scrollable,
with the not-saved opening initially visible; use a smaller cap if needed to retain a 44×44
CSS px admitted ink area. At 740×320, header 64/top row 72 and the measured 50 px disclosure
leave about 134 px before zoom/safe-area allowances. At 320×700 uk/200%, a 233 px footer cap,
96 px header and 72 px top row leave about 299 px before those allowances, with scrolling
required for the 319 px disclosure. The zoom readout follows the disclosure at the trailing
edge; it can require an extra text row and must be included in actual footer measurement.
At short landscape/200%, these assumptions leave little space, so actual row heights/safe
areas may make drawing unavailable. Preserve Back and scrollable controls and show the size
state when the minimum admitted ink area cannot fit. This threshold protects a basic target,
not a performance or universal minimum-window guarantee. DOM wrapping, pseudo-expansion,
fallback fonts, scrollbar effects and context-row height remain required runtime checks.

Define the actual drawable rectangle between header/context, rail and footer; chrome never
receives ink. Rust maps its center to fixed world origin at zoom 1; resize changes visible
extent around the same center, not saved geometry. Actual coordinate mapping and admissible
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
settings, cancellation and error states settle immediately; no new animated progress indicator.
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
| memory.historyLifetime | Back keeps the drawing, but clears Undo/Redo. | Назад залишає малюнок у пам’яті, але очищує історію дій. |
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
| memory.canvas | Temporary drawing canvas | Полотно тимчасового малюнка |
| memory.instructions | Draw with a mouse, pen or touch. Escape cancels the current stroke. This drawing is not saved. | Малюйте мишею, пером або дотиком. Escape скасовує поточний штрих. Цей малюнок не зберігається. |
| memory.strokeCancelled | Current stroke cancelled. | Поточний штрих скасовано. |
| memory.strokeRejected | This stroke exceeded the drawing limits and was cancelled. Earlier strokes are unchanged. | Цей штрих перевищив обмеження малювання, тому його скасовано. Попередні штрихи не змінено. |
| memory.inputRejected | This stroke could not be accepted and was cancelled. Earlier strokes are unchanged. | Цей штрих не вдалося прийняти, тому його скасовано. Попередні штрихи не змінено. |
| memory.capacity | Memory limit reached. The current stroke was cancelled. Earlier strokes are unchanged. | Досягнуто обмеження пам’яті. Поточний штрих скасовано. Попередні штрихи не змінено. |
| memory.capacityBegin | Memory limit reached. A new stroke could not start. Earlier strokes are unchanged. | Досягнуто обмеження пам’яті. Не вдалося почати новий штрих. Попередні штрихи не змінено. |
| memory.historyLimited | Older Undo steps are no longer available. Your drawing is unchanged. | Давніші дії більше не можна скасувати. Малюнок не змінено. |
| memory.displayLost | Drawing display is unavailable. Your drawing remains in this tab’s memory. | Відображення малюнка недоступне. Малюнок залишається в пам’яті цієї вкладки. |
| memory.retryDisplay | Retry display | Відновити відображення |
| memory.sizeUnavailable | This window size cannot display the drawing. Resize the window; your drawing remains in memory. | За цього розміру вікна малюнок неможливо відобразити. Змініть розмір вікна; малюнок залишається в пам’яті. |
| memory.fatal | Drawing stopped after an internal error. This temporary drawing cannot be recovered here. | Малювання зупинено через внутрішню помилку. Цей тимчасовий малюнок тут неможливо відновити. |
| memory.unavailable | The temporary drawing is unavailable. It was not saved. | Тимчасовий малюнок недоступний. Його не було збережено. |
| memory.navigationUnavailable | Navigation could not finish. Your drawing remains in this tab’s memory. | Не вдалося завершити перехід. Малюнок залишається в пам’яті цієї вкладки. |
| memory.historyRestarted | Temporary drawing resumed. Undo/Redo history starts here. | Тимчасовий малюнок продовжено. Історія скасування й повторення дій починається звідси. |

Error selection uses stable typed outcomes; never parse English Rust text. `{tool}` is a
localized app-owned tool label and `{color}` is validated opaque sRGB text, not raw user input.
Use `memory.capacity` only when `activeCancelled=true`; rejected Begin without an interaction
uses `memory.capacityBegin`, never claiming that a stroke was cancelled.
Numbers/percentages use independent browser regional formatting; the table's 100% conveys
meaning, not permission to hardcode formatting. Resource/layout/runtime/linguistic approval
remain four distinct checks. No count/plural message is needed by this scope.

## Observable acceptance and evidence ownership

All rows below are **planned, unrun** against the new engine/design. Existing v2 browser results
are regression context only. Web implementer owns real browser E2E actions and failure fixtures;
Rust specialist owns semantic expectations, designer combined UI review, lead exact evidence,
and fresh reviewer independent assessment. E2E-only owner policy supersedes older unit/core/
bridge-suite wording. Numerical experiments are analysis, not browser/physical-device evidence.

| Proposed test ID / scenario mapping | Trigger, visible outcome and invariant | Required evidence |
| --- | --- | --- |
| WMP-01A / DRAW-001; CT-01/02/06, INV-01/02/04, SU-02/03/04 | New, tap, pressure/constant-width stroke, duplicate point and sharp turn; complete round ink then one-step Undo/Redo. Earlier settings remain attached to earlier strokes. | Real app/Rust/Wasm/CanvasKit mouse E2E plus visible captures; explicitly labeled injected pressure lane, physical pen gap. |
| WMP-01B / CT-01/09, INV-05/11, SU-07/20 | Width 1/8/512, keyboard and pointer change/cancel; native color change/cancel, invalid return, active-stroke rejection. Correct accepted value and next-stroke appearance. | Native range actions; browser color-panel controllability limitation and separate actual panel evidence. Directly setting DOM value is not picker interaction proof. |
| WMP-02A / DRAW-CANCEL-001, FOCUS-001; CT-02/03, INV-03/04 | Escape/blur/hidden/capture loss/remap cancel whole transient ink; A/B/C/late-A sequence leaves C valid. Repeated cancel is harmless. | Browser lifecycle/input E2E with labeled injected conditions; before/after completed pixels and history eligibility. |
| WMP-02B / CT-02/06, INV-04/08/11, SU-14/16 | Resize, backing-density change, orientation and virtual keyboard while active cancel once; idle resize preserves world content/settings/history. | Real resize E2E plus synthetic DPR/keyboard fixtures; hardware transition gap separately. |
| WMP-03A / HISTORY-SESSION-001 (memory subset), FOCUS-001; INV-04/05 | Buttons and scoped shortcuts undo/redo, active stroke blocks them; field/IME keeps native commands; settings create no history. | Actual focus/key E2E; physical IME and screen-reader gap. |
| WMP-10 / CT-03/08, INV-01/04, SU-13 | Back retains ink but clears history only on accepted departure; Resume/Forward same ink/settings; rapid traversal/stale loader/failed target cannot corrupt it. Samples and Reset samples preserve temporary owner. | Browser history/Back/Forward, short/long transition and reduced-motion E2E, gallery focus/scroll assertions. |
| WMP-04 / REG-PREC-01/04/06; CT-02/04, INV-03 | Approved finite/numerical boundary fixtures exercise real app intake; current malformed/over-limit batch cancels only current stroke. | Reviewed isolated fixture path; exact coordinates stay out of normal logs; visible prior artwork and eligibility checked. |
| WMP-05A / SEC-02/03/13; CT-04/06, INV-08/09 | Asset failure/retry/back race, capacity and oldest-history boundary preserve completed ink, no silent owner replacement. | Fault E2E and actual messages; production artifact excludes fault controls. |
| WMP-05B / CT-03/06, INV-01/08 | Surface loss → retry display retains owner/history; fatal engine failure disables editing and discloses unrecoverability; reload temporary route returns gallery unavailable. | Separately labeled renderer/engine fault lanes, reload and cold URL E2E; no crash-recovery claim. |
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
truthful visible outcomes only. Stop at this review packet until owner contract/design approval.
