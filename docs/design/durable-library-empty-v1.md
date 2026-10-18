# Durable empty library — identified design v1

Prepared 2026-10-19 by ui_ux_designer against base
`fbcc30ca115d630d6c9e688b1525d3ee1dcc89d7` plus preserved work. **Proposed for identified
owner design/implementation approval. No durable UI has been implemented.** Decisions 233–234
already select the gallery and drawing-shell appearance; decision 237 approves the storage
experiment, browser-local risk posture and subsequent removal amendment. This packet completes
the first-slice design rather than reopening those choices. Ukrainian text below is a contextual
draft, not proficient linguistic approval.

Read with [typed library contract](../interfaces/durable-library-v1.md),
[storage proposal](../architecture/browser-storage-v1-proposal.md),
[existing gallery](live-web-prototype.md), [D01](drawing-screen-proposal.md),
[deferred removal states](durable-library-states-v1.md), [navigation](../navigation.md) and
[locale acceptance](../testing/internationalization.md).
CT-01/03/05/08/09; INV-01/06/07/09/10/11; SU-09/10/12/20/21. Lead owns engineering integration.

## Identified review artifacts and scope

- [Gallery states board](durable-library-empty-v1/gallery-states.svg): DLW-01 admission/refusal,
  DLW-02 bounded list and DLW-03 creation/outcome. Desktop English and narrow Ukrainian.
- [Rename and recovery board](durable-library-empty-v1/rename-recovery-states.svg): DLW-05
  anchored Rename, unknown outcome and durable projection pending; DLW-08 reconstruction.
- [Blank shell board](durable-library-empty-v1/blank-shell.svg): DLW-06 durable blank shell,
  narrow Ukrainian and DLW-04 open failure. Drawing geometry remains the selected D01 layout.

These are authored SVG composition/specification boards, not application screenshots, browser
execution, physical accessibility evidence or a working persistence prototype. Frame labels and
notes outside the app rectangles are review annotations. Reuse current semantic theme values,
system-font stack, button shape and icon assets in implementation; schematic board symbols do
not replace approved icons. The prose state table also identifies variants sharing a frame.

First slice: actual catalog entry, bounded listing, durable blank creation, explicit open,
rename and reopen. No automatic conversion/seeding of six sample drawings; those remain prototype
fixtures. Production Delete is unavailable with a readable explanation in the existing action
menu. No Trash, orphan-removal selector, import/export, backup, real ink or new tool behavior.
The later deletion design is separate; defer its additional schema/runtime activation as the
implementation scope permits. A drawable-looking empty surface must still disclose no drawing
engine. Disposable D01 settings remain disposable and cannot alter stored fields.

## Layout, adaptive behavior and visual treatment

Preserve the gallery header and 1372px maximum grid with 32px desktop side padding, 24px gaps,
three columns at 960px+, two at 640–959px and one below 640px. Existing card aspect ratios,
ellipsis positioning, hover/focus names, New tile and narrow populated-gallery New button stay.
Do not reorder on open, rename or projection repair. The durable default-name sequence is shown
as stored by Rust, including its numeric suffix; disposable prototype wording cannot override it.

Place storage/lifecycle feedback directly below the Linefield header, within the same grid
width. It uses a plain semantic panel, 16px padding, 8px text/action gap, 14px body and 44px
minimum action targets. No toast timeout or color-only success/error. Reserve the resolved
locale/text-scale footprint before exposing cards; admission/loading/failure uses that same
region. Longer later content may grow with normal reflow only while preserving the focused
UUID and scroll anchor. Do not animate height or insert asynchronous rows above an active card.
Keep a baseline storage disclosure visible; replace its status line, not the whole grid, when
the persistent-storage result arrives. Multiple issues use one ordered status region: blocking
operation/recovery first, then the baseline storage disclosure. Do not stack overlapping banners.

Rename retains the existing anchored modal, width min(360px, viewport minus32px), 24px padding,
16px viewport margin, source emphasis and shared scrim. Add a reserved two-line outcome area
after the field. Content can grow/scroll for longer errors; keyboard viewport changes preserve
the field, action reachability and anchor. No truncated validation/error text. Names truncate
visually only on cards/title, with complete accessible names and bidi isolation for user text.

D01 retains the 72px rail /64px header (56px/56px narrow), scrollable top settings and artwork
space. Replace its existing bottom preview notice with a wrapping two-part notice: the empty
drawing's durable status, followed by the explicit UI-only tools notice. At narrow sizes stack
these full messages; reserve bottom clearance and keep zoom reachable. Do not add a global Save
button or imply that D01 ranges have become persisted preferences. `Saved in this browser` is
shown only for a confirmed document revision and never means eviction-proof or cloud-backed.

Required runtime review sizes: 320×800 minimum, 390×844, 768×1024/1024×768, 960×700,
1440×1000 typical and1920×1080 wide; additionally844×390 short, breakpoint±1px, 200% text,
virtual keyboard, light/night/forced colors, en/uk, expanded LTR and pseudo-RTL with mixed names.
These are evidence samples, not device-name branches or a claim of a maximum supported window.
RTL may adapt chrome reading order; artwork and physical left rail remain unchanged in this slice.
Use opaque current panels in contrast/reduced-transparency modes, visible focus and system colors
in forced colors. Do not introduce new accent palettes, artwork recoloring or custom spinner assets.

## Flow and state contract

Startup → storage admission → recover/list → gallery. Explicit New → reserved → document durable
→ catalog published → ready attachment → accepted blank-shell route. Explicit Open → ready
attachment → accepted blank-shell route. Rename → authoritative metadata commit → catalog repair.
Cancel, worker loss and failure branch at their actual durable boundary; animation owns no branch.

| Frame/state | Trigger, visible result and available actions | Focus/navigation and invariant |
| --- | --- | --- |
| DLW-01a Starting | Startup checks capabilities and storage. Show Checking local storage; New unavailable until authority is ready | No auto-focus steal; initial document reading order is title, status, gallery. No false empty-success or temporary saved fallback |
| DLW-01b Ready, grant refused/unavailable | Show storage disclosure plus Browser protection was not granted; creation remains allowed under approved posture | Persistent request uses a readable button and normal browser API. A refusal remains visible; no repeated permission nag or automatic loop |
| DLW-01c Capability/access blocked | Storage unavailable; Retry checks admission again. New/Open mutations unavailable, no fabricated cards | Focus stays on Retry after activation; no filesystem permission instructions or claim that a different browser guarantees safety |
| DLW-02a Empty | Successful bounded query has zero items; existing centered dashed New tile | Empty is a confirmed result, not absence of data while loading. New focus and appearance follow current gallery |
| DLW-02b Loading/page failure | Reserve card dimensions. Failing page has a same-region explanation and Retry; valid loaded items remain | `aria-busy` only on loading region; one polite result announcement. Retry neither clears pages nor moves focused items |
| DLW-02c ResyncRequired | Keep visible UUID anchors while requesting current bounded pages; do not mix generations | Restore focus/scroll to same UUID after refresh; if absent, nearest surviving item then New. Never replace entire page on each notification |
| DLW-03a New pending | New shows Creating drawing; repeated New is unavailable. A Cancel opening action cancels destination intent only | Keep initiating focus. Announce that creation may already have been saved when cancellation follows reservation; no rollback promise |
| DLW-03b Unknown | Checking whether your drawing was created; Check again queries frozen operation, never starts another New | Guard duplicate New and route acceptance while unresolved. Browser exit cannot guarantee completion; restart enters gallery and recovers durable state |
| DLW-03c Durable but not published | Drawing saved; library list is updating. No phantom published card; retry reconciles publication | Preserve immutable document/operation identity. Cancel opening leaves durable content available through recovery; no abandoned-item deletion |
| DLW-03d Published, open failed/cancelled | Show durable card and Drawing created, but could not be opened; Open again targets that same document | On failure focus card Open or error action; do not return focus to an enabled New invitation implying nothing was created |
| DLW-04a Open preparing | Existing gallery remains visible with opening status, Cancel opening available | Route/history and source stay accepted until NavigationOutcome.Accepted. Cancellation releases only its unused attachment |
| DLW-04b InUse/access/missing/invalid/unsupported/conflict | Explain exact typed reason with Retry where meaningful; leave valid other cards usable | No duplicate writer, new blank replacement or automatic salvage. Focus triggering card/status, maintain accepted gallery route |
| DLW-05a Rename editing | Existing anchored form; complete field value, Cancel and Rename. Validation is non-destructive | Native text selection, Undo, IME and Escape have priority. Submit must not end composition. Outer trim only through reviewed semantics |
| DLW-05b Rename pending | Field becomes read-only; submission disabled; Saving name. Close dismisses presentation, not an accepted write | Keep focus on the pending status/action. Dismissal returns to original ellipsis; operation remains tracked. Do not offer Cancel as undoing a submitted rename |
| DLW-05c Proven rejection/rollback | Form preserves attempted name and explains issue; amend/retry with new accepted intent or Cancel | Original durable name remains. MetadataConflict shows current name separately and requires renewed explicit submission against the current version |
| DLW-05d Unknown | Checking whether the name was saved; Check again queries frozen operation. No second rename on this drawing until reconciled | Keep attempted and last-confirmed names distinguishable. Closing does not resolve uncertainty; retained per-item status remains reachable |
| DLW-05e Durable, projection pending | Close form to ellipsis, show confirmed new name in owning projection, Name saved; library list is updating | This is successful rename, not failed Save. Other-tab stale projections must not claim currency; repair may not overwrite a newer revision or reorder |
| DLW-06 Blank shell/reopen | Actual name, empty surface, confirmed saved status and tools-preview notice; Back available | No ink, selection, history or tools state restored from disposable D01. Focus Back after acceptance unless user deliberately moved it |
| DLW-07 Back/Forward/reload | In-app history requests use the same guards. Reload/normal relaunch enters gallery; existing documents remain | Preserve accepted route until outcome; no extra history entries for retries/settings. Direct drawing URL is untrusted input, not auto-open authority; resolve to gallery with an explicit Open action |
| DLW-08a Reconstruction | Recovering your library. Automatic work under exclusive maintenance; no Reset/Clear/Discard button | Block admission while reconstruction authority is unsettled; preserve files and stable status focus; do not show an empty collection |
| DLW-08b Reconstructed, naming unknown | Valid recovered items usable; New unavailable with Cannot create drawings until library naming is recovered. Recovered order disclosure | Open/rename valid items where capability permits. Do not guess numbering from names or claim original ordering restored |
| DLW-08c Partial/conflicted/failed recovery | Retain validated available items and visible unavailable/conflict entries; Retry only safe reconciliation | No editable winner chosen for duplicate identity, no cleanup consent inferred. A Retry cannot erase preserved sources or turn missing authority into Ready |

After full runtime loss an old create/rename outcome may remain unknowable. Present current
validated state without claiming the old request succeeded or failed. Browsing/reconciliation
can resume under new authority; a new explicit operation is not an automatic retry of old work.
Unknown must not permanently trap browser navigation or pretend the app can block close/reload.

## Locale messages and semantic IDs

Use these full messages as proposed catalogue entries with existing actions where available.
`{name}` is literal user content, rendered as text with bidi isolation. Runtime reasons map to
complete messages; no raw SQL/IDs/paths, technical locks or concatenated sentence fragments.
The English drafts establish intended meaning; all Ukrainian rows need proficient review.

| Stable proposed ID | English | Ukrainian draft |
| --- | --- | --- |
| library.storage.disclosure | Drawings are stored in this browser. Clearing site data or browser storage eviction can remove them. | Малюнки зберігаються в цьому браузері. Очищення даних сайту або автоматичне звільнення сховища браузером може видалити їх. |
| library.storage.checking | Checking local storage… | Перевіряємо локальне сховище… |
| library.storage.request | Request storage protection | Запросити захист сховища |
| library.storage.granted | Browser storage protection is enabled. Clearing site data can still remove drawings. | Захист сховища браузера ввімкнено. Очищення даних сайту все одно може видалити малюнки. |
| library.storage.refused | Browser storage protection was not granted. Drawings can still be stored here. | Браузер не надав захист сховища. Малюнки все одно можна зберігати тут. |
| library.storage.unavailable | Local storage is unavailable. Your drawings have not been replaced or cleared. | Локальне сховище недоступне. Ваші малюнки не замінено й не видалено. |
| library.loading | Loading drawings… | Завантажуємо малюнки… |
| library.page.failed | These drawings could not be loaded. | Не вдалося завантажити ці малюнки. |
| library.creating | Creating drawing… | Створюємо малюнок… |
| library.create.unknown | Checking whether your drawing was created… | Перевіряємо, чи створено ваш малюнок… |
| library.create.projectionPending | Drawing saved; the library list is updating. | Малюнок збережено; список у бібліотеці оновлюється. |
| library.create.openFailed | Drawing created, but could not be opened. | Малюнок створено, але відкрити його не вдалося. |
| library.open.pending | Opening drawing… | Відкриваємо малюнок… |
| library.open.inUse | This drawing is in use and cannot be connected right now. | Цей малюнок використовується, і зараз під’єднатися до нього неможливо. |
| library.open.unavailable | This drawing is unavailable. Other drawings can still be opened. | Цей малюнок недоступний. Інші малюнки можна відкрити. |
| library.open.invalid | This drawing could not be read safely. It has not been replaced or cleared. | Не вдалося безпечно прочитати цей малюнок. Його не замінено й не видалено. |
| library.open.unsupported | This drawing uses an unsupported format version. | Цей малюнок має непідтримувану версію формату. |
| library.open.conflict | Conflicting copies of this drawing were found. None has been selected for editing. | Знайдено конфліктні копії цього малюнка. Жодну з них не вибрано для редагування. |
| library.storage.full | Storage is full. This change has not been confirmed as saved. | Сховище заповнено. Збереження цієї зміни не підтверджено. |
| library.storage.capacity | This version has reached its storage-operation limit. Existing drawings remain available. | Ця версія досягла обмеження операцій зі сховищем. Наявні малюнки залишаються доступними. |
| library.storage.access | Access to local storage is unavailable. Stored drawings have not been cleared. | Доступ до локального сховища відсутній. Збережені малюнки не видалено. |
| library.storage.io | The storage operation could not be completed. Check its outcome before trying again. | Не вдалося завершити операцію зі сховищем. Перевірте її результат перед повторною спробою. |
| library.rename.saving | Saving name… | Зберігаємо назву… |
| library.rename.unknown | Checking whether the name was saved… | Перевіряємо, чи збережено назву… |
| library.rename.projectionPending | Name saved; the library list is updating. | Назву збережено; список у бібліотеці оновлюється. |
| library.rename.conflict | The name changed elsewhere. Review the current name before trying again. | Назву змінено в іншому вікні. Перевірте поточну назву перед повторною спробою. |
| library.rename.current | Current name: {name} | Поточна назва: {name} |
| library.rename.invalid | Use a nonempty, single-line name with no unsupported control characters. | Введіть непорожню назву в один рядок без непідтримуваних керівних символів. |
| library.rename.tooLong | This name is too long. Shorten it before trying again. | Ця назва задовга. Скоротіть її перед повторною спробою. |
| library.rename.failed | The name was not saved. Your entered name is still available to edit. | Назву не збережено. Введену назву можна й далі редагувати. |
| library.saved | Saved in this browser | Збережено в цьому браузері |
| library.blank.notice | Empty drawing saved. Tools are a UI preview and do not edit the drawing. | Порожній малюнок збережено. Інструменти є прототипом інтерфейсу й не редагують малюнок. |
| library.recovery.pending | Recovering your library… | Відновлюємо вашу бібліотеку… |
| library.recovery.partial | Some drawings need recovery. Available drawings can still be opened. | Деякі малюнки потребують відновлення. Доступні малюнки можна відкрити. |
| library.recovery.naming | Cannot create drawings until library naming is recovered. | Створення малюнків недоступне, доки не відновлено нумерацію назв у бібліотеці. |
| library.recovery.order | Recovered drawings are shown by creation date. Their previous order could not be restored. | Відновлені малюнки впорядковано за датою створення. Попередній порядок відновити не вдалося. |
| library.delete.unavailable | Delete is not available in this version. | Видалення недоступне в цій версії. |
| library.action.retry | Retry | Спробувати ще раз |
| library.action.check | Check again | Перевірити ще раз |
| library.action.cancelOpening | Cancel opening | Скасувати відкриття |
| library.action.close | Close | Закрити |
| library.action.openAgain | Open again | Відкрити ще раз |

`library.rename.failed` is only for proven rollback/rejection, never Unknown. Capacity wording
must be paired with actual capabilities: it does not override an independent inaccessible item.
No frame may ship an English-only fallback as Ukrainian acceptance. The contract's precise scalar/byte limits replace the prototype's 240
UTF-16 maxlength; hosts explain limits without truncating input or silently rewriting Unicode.

## Input, focus, motion and failure acceptance

Keyboard Tab/Shift+Tab follows visible semantic order; Enter/Space activate ordinary buttons.
No new global bindings. Native browser zoom/context menu/long press and text shortcuts remain.
Pen and touch activate controls through ordinary pointer semantics; no ink, pen accessory or
custom multi-touch behavior is added. Browser menus, reload, close and system navigation remain
system-owned. Native Services, file import, watch/TV and platform dialogs are outside this web
slice; semantic capabilities remain an engine obligation rather than a hidden UI switch.

One polite live region announces operation phase changes, never polling ticks. Field validation
uses its labelled error; fatal errors are announced once without repeated focus theft. Disabled
controls have adjacent readable explanations. Pending buttons retain stable focus through
`aria-disabled` semantics and guarded handlers; a programmatic native disabled toggle must not
drop focus to body. Closing a modal returns to the same UUID ellipsis; if absent, use the nearest
surviving card then New. Unknown operations retain a per-item accessible status after dismissal.

Retain existing gallery/card and Rename transitions after semantic acceptance. During storage
wait the source stays visible: no empty animation shell conceals delay. Reduced motion settles
immediately with identical data/history/focus. Resize, changed theme, stale completion and focus
loss do not commit/cancel storage. Accepted navigation cannot depend on animationend. Inactive
controls are inert during travel; stale completion never steals deliberate user focus.

| Case / contract scenario | Trigger and required result | Owner / evidence status |
| --- | --- | --- |
| DLW-A01 / DLIB-01, LIBRARY-CREATE-001 | New en/uk; restart; same identity/card/name; no fixture seeding or duplicate blank | Rust/web; planned semantic plus browser restart |
| DLW-A02 / DLIB-03, LIBRARY-FAILURE-001 | Kill before/after publication; lost reply; Cancel opening; preserve durable item and unique ordinal | Rust/web; planned fault and actual browser flow |
| DLW-A03 / DLIB-04/05 | Rename commits, projection fails, later rename, stale callback; confirmed name cannot regress/reorder | Rust/web; planned SQL plus visible two-client cases |
| DLW-A04 / DLIB-06, LIBRARY-NAV-001 | Rapid Back/Forward plus resize and unknown Open; accepted route and source focus remain correct | Web/designer; planned normal/reduced motion |
| DLW-A05 / DLIB-09 | Catalog absent/corrupt, naming authority lost, duplicate identity; no false empty view, guessed New or editable conflict winner | Rust/web; planned reconstructed/partial/failure captures |
| DLW-A06 / DLIB-10 | Page token invalidation while focused/scrolled; preserve UUID anchor and card dimensions | Web; planned real paging and keyboard evidence |
| DLW-A07 / DLIB-12 | Full/capacity/access/refusal; truthful status and bounded retry; reconciliation remains reachable | Rust/web; planned distinct fault classes |
| DLW-A08 / DLIB-13, I18N-LAUNCH-002/I18N-UK-002 | IME Enter/Escape, multiline/combining/bidi names, 200% text, keyboard viewport; no submit during composition or clipped controls | Web/designer; planned browser/physical IME/AX, proficient uk gap |
| DLW-A09 / INV-10 | Invoke unavailable Delete through UI/forged command; no durable mutation | Rust/web; planned shared rejection plus visible explanation |

## Integrated designer disposition and gates

Behavior review: first-slice flows, durable/unknown/projection states, reconstruction, capabilities,
history/focus, text input and failure priorities are specified against the typed contract.
Presentation review: selected components retained; identified boards and adaptive/locale/motion
rules supplied. Static boards do not prove automatic resizing, accessibility or runtime durability.
No competitor research round is needed for this bounded application of selected components.

Before owner implementation approval, lead must bind this exact design version to the final
contract/schema and actual storage-experiment limitations, resolve independent review findings
and state which browsers can be admitted. No new product-choice questionnaire is necessary for
ordinary implementation tests. Proficient Ukrainian review remains an explicit locale-readiness
gate; implementation must include actual new-state en/uk layouts, browser/fault tests, running
designer review and fresh independent acceptance. Native appearance/input/latency/power-loss
claims remain outside this web slice. A reviewed SVG is not a golden screenshot or user study.
