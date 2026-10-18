# Navigation, routes and document lifecycle

Status: authorized web prototype navigation is implemented, including gallery/drawing URLs,
browser history and focus restoration; see [P05-D01 evidence](../apps/web/quality/web-drawing-v2/README.md).
Concrete durable/native route adapters and lifecycle guards still await S00D/S02 review.
No native URL scheme, link association or deployment configuration is established by that evidence.
The product contracts below describe future durable/native behavior; disposable web state does
not implement Rust/storage authority. Unseen screens and native flows retain their design gates.

## Boundaries and terminology

A destination describes where the user is: a document chooser, editor or viewer. A route names
that destination and its minimal parameters. History records navigation, not drawing undo.
A transition is the visual/interactive movement between states; it does not own data lifecycle.
A deep link is an external request for a route; it is untrusted input, not a permission grant.

Each host owns a typed navigation coordinator, native stack/window presentation and optional
URL parser/encoder. Shared Rust owns command validation, editing/viewer capabilities, active
interaction cancellation and dirty/save/open/recovery policy. Do not move AppKit controllers or
browser history into Rust, or duplicate Rust dirty-state policy in host routers.

Use one route source of truth per host/window. URL and visible UI are projections of accepted
navigation; loading targets and externally requested URLs are explicit pending state. Avoid
separate boolean screens, URL setters and controller stacks that can silently diverge.

Requests that affect a document enter the same typed Rust command/effect boundary used by
menus/shortcuts: request Open/New/Close, resolve pending/failed autosave and cancellation, then
apply validated results. Follow [autosave policy](autosave.md); there is no routine discard-to-open behavior.
Pure presentation changes need not become document commands. No string URL is a serialized
editing command; animation progress never dispatches document mutations. Concrete DTOs stay S02.

## Proposed destination catalog

| Destination | Parameters and behavior | Scope |
| --- | --- | --- |
| Start | Always macOS gallery/library, including after crash recovery; explicit external-file import is a separate intent | Owner selected decisions 7/19; S02L |
| Documents | App-managed gallery/library; restore list focus/position on return | macOS scope approved; S02L before canvas, not implemented |
| Editor | Host document reference or ephemeral draft reference; requires editor capability and validated load | Approved editing capability; exact presentation/route pending |
| Viewer | Accessible document reference and viewer capability; edits rejected by Rust | TV/Watch direction; per-platform review |
| Loading / unavailable / recovery prompt | States within a route attempt or native presentation, with retry/cancel where applicable | No separate app page required by this catalog |

Tool choice, selected stroke, hover, pan/zoom and transient dialogs are normally session/UI state,
not URL history entries. Do not put every brush action into browser Back. No settings/library/
account page is introduced merely to populate a route map.

## Implemented prototype URLs and future durable routing

The authorized prototype uses `/` and `/drawing/<known-id>` in apps/web/src/routes.ts.
Unknown/unavailable drawing IDs return to the gallery; direct sample links establish an in-app
Back destination. This is disposable gallery availability, not a durable registry or access grant.
See the exact browser evidence above. No route rewrite is requested by this document.

The following hash-route examples are historical planning alternatives for a future durable
deployment review, not the current prototype grammar or a requirement to replace it.

For an initial static host without rewrite rules, recommend hash routes under the deployment
base. Illustrative shapes (not approved grammar):

- /#/documents — proposed chooser.
- /#/documents/<opaque-local-id>/edit — editor for locally resolvable content.
- /#/documents/<opaque-local-id>/view — viewer; capability still enforced independently.
- /#/drafts/<ephemeral-id>/edit — in-memory draft, not a durable/shareable document address.

If deployed under /linefield/, preserve that base: /linefield/#/documents/… . Clean path URLs
such as /documents/<id>/edit are an alternative only after direct-load/reload fallback hosting
is specified and tested. Vite's development fallback does not prove production routing works.
No hosting service or router library is selected by this example.

Document route IDs are opaque local references resolved through an authorized host registry,
not filesystem paths, filenames, credentials or arbitrary network URLs. They are neither
capability tokens nor promises that another device/browser profile can open the same document.
Concrete registry persistence, ID lifetime, Save As/replacement semantics and conflict handling
are reviewed in S02. Do not conflate session IDs, document IDs and storage-provider identities.

Normal app navigation adds one history entry after guards and destination validation succeed.
Use replacement for canonicalization or draft-to-saved identity changes where approved; do not
create duplicate entries for retries or animation frames. Specify initial-entry state, route
roundtrip parsing, unknown route handling and direct-link bootstrap. Never run commands from
unknown query parameters. Locale changes do not change semantic route IDs.

Back/Forward and an externally edited URL are requests too. Browser traversal may change the
address before an asynchronous guard runs: retain the active document, show pending state and
use reviewed entry/index tracking to restore cancelled in-app traversal without loops, lost
Forward entries or duplicate loads. Do not claim popstate/hashchange can simply be prevented.
Review this behavior before choosing a routing library; test rapid and multi-entry traversal.

Reload/closing the tab/leaving the origin is different from in-app navigation. Browser unload
prompts have restrictions and are not reliable recovery machinery; do not try to await saving
inside unload. Use reviewed ongoing recovery/storage policy and optional dirty-only native
warnings where supported. An absent in-memory draft after reload gives an honest unavailable/
recovery path, never an empty drawing silently presented as the previous file.

See [History API](https://developer.mozilla.org/en-US/docs/Web/API/History_API/Working_with_the_History_API)
and [beforeunload limitations](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event).
Same-origin history behavior and local storage access are browser-specific test requirements.

## Common document navigation flow

```text
flowchart TD
    Request[Native action, Back or validated route request] --> Guard[Shared interaction and dirty-state policy]
    Guard -->|cancel| Stay[Keep current session and restore host navigation]
    Guard -->|writes pending| Save[Revision-safe autosave completion]
    Save -->|failure, cancelled or newer edits| Guard
    Save -->|safe to continue| Resolve[Resolve access and validate target]
    Guard -->|current revision persisted| Resolve
    Resolve -->|failure| Stay
    Resolve -->|valid target and current operation| Accept[Accept destination and session change]
    Accept --> Host[Update native presentation or browser history]
    Host --> Motion[Approved transition and focus restoration]
```

Historical relationship notation; no diagram renderer is required.

Keep the old session until the replacement loads successfully, so failed Open preserves the
drawing. Save success for revision N cannot authorize leaving N+1 silently; recheck or prevent
conflicting edits under the reviewed policy. Any future option to abandon unpersisted changes
needs revision-specific consent, never a blanket discard-to-open interpretation. Navigation
cancellation cannot undo a database transaction or file replacement already completed.
For exit to a chooser, no target decode is needed, but dirty and interaction guards still apply.

Cancel active gestures according to CT-02 before changing their coordinate context. Invalid
external links do not disturb the current session. Deduplicate repeated opens and generation-
check asynchronous completions; an older load cannot replace a newer accepted destination.
Bound pending work. Loading failure/cancel retains prior content, focus and route where possible.
Initial launch with no library items shows the approved empty gallery with New available; missing requested documents show an unavailable state without hiding the library.

Interactive Back/swipe cancellation must not discard the session during its visual preview.
Resolve guards before irreversible navigation; if the native gesture cannot suspend safely,
use the platform-supported gating/alternative and explain it in the approved design. On accepted
navigation restore focus to the intended native control/canvas; returning to a chooser restores
its prior focus/scroll when available. Accessibility announcements describe the destination,
not every animation frame. A cancelled modal returns focus to its invoking control.

## Host mappings

| Host | Navigation representation and required checks |
| --- | --- |
| macOS | Native window/controller presentation and file panels; first preview uses the selected gallery/editor single-window model. No visible URL needed; Finder/file-open events use the guarded Open path. Custom URL scheme is deferred until approved. |
| iPhone/iPad | UIKit-native compact stack or split presentation appropriate to size class. Native file selection, swipe Back cancellation, scene restoration and optional future links map to the same document intents. |
| Android | Compose-hosted Android navigation/back stack; review Back/Up, supported predictive Back, recreation and document access permissions. External intents do not bypass guards. |
| Windows | WinUI host navigation where pages exist, native dialogs and window lifecycle. File activation and optional protocol activation require validated target/access and session routing. |
| Linux | GTK/libadwaita navigation/window presentation, portals and file activation. Built-in Escape/Back must not override canvas cancellation or native text focus. |
| Web | URL/history as specified above, address entry, Back/Forward, reload/offline/permission/unload cases and keyboard/AX focus. |
| ChromeOS | Reuse chosen Android or web route semantics with desktop resizing/input; no separate route runtime. |
| tvOS / Android TV / Google TV | Proposed chooser-to-viewer flow, remote Back/focus restoration; editor routes rejected or explicitly mapped to read-only under reviewed policy. |
| watchOS | Native list/detail viewer and source/loading/offline states; Crown scroll is not route history. No dependence on the iPhone being reachable to show local state; future network links/auth remain separately scoped. |
| visionOS / Android XR | Approved 2D surface navigation, focus and lifecycle per host. Do not treat every destination change as creation of an immersive space. |

Use platform conventions rather than identical stacks. [Android navigation principles](https://developer.android.com/guide/navigation/principles)
are a reference, not a decision to install a particular navigation library. All platforms need
a route/state table even when their UI never displays a URL. Native external-link schemes,
associated domains and remote routing require separate security/scope review before registration.

## Restoration, security and diagnostics

Persist only reviewed minimal navigation/session metadata; restoring a route is not recovering
unsaved drawing content or undo history. Revalidate file access and viewer capabilities after
restart, missing/deleted files, revoked permissions or unavailable sources. Device-local IDs
may be unavailable elsewhere. New-window/multiple-tab conflict policy must be reviewed before
shared writable storage is used; single-window macOS scope does not settle browser concurrency.

Allowlist route kinds/parameters, bound lengths and reject invalid encoding/traversal/unsupported
schemes. Never auto-fetch a supplied URL or run commands from a link. Paths, grants and tokens
stay out of addresses, logs and analytic events. Opaque IDs can still correlate activity: normal
logs record route kind/origin/outcome and ephemeral operation correlation, not raw URLs/IDs.
Log accepted/rejected/cancelled navigation once per meaningful boundary; no per-frame logging.

## Review and delivery

S00D settles start destination/chooser scope, route catalog, Back/dirty flow and motion handoff.
S02 extends CT-01/CT-03/CT-05/CT-07/CT-08/CT-09 packets with concrete identity/guard/restoration
and boundary rules; no extra generic router crate or binary command protocol. S04/S05 cover
implemented motion/focus; S06 covers document lifecycle navigation; platform tasks add real
native/URL cases. See [navigation/motion scenarios](testing/navigation-motion.md).

Wear OS (P12) uses reviewed native watch list/detail navigation and Back/swipe dismissal, rotary input where present, local/offline restoration and capability guards. Toolkit and source/standalone policy remain open; do not copy a phone stack or assume phone availability.

Decision 7/S02L supersedes gallery-as-unapproved wording: gallery is approved for macOS, before
canvas. Durable app-managed drawings require durable identity; earlier ephemeral draft web URL
examples are not the default for persisted library items. Review concrete routes in S02; no web
implementation or hosted sharing links are authorized. Gallery return resolves pending autosave.

Decision 10: successful gallery return or document-session replacement ends Undo/Redo history.
Resolve interaction/persistence guards first. Cancelled/failed navigation retains the old session
and history. Dialogs, focus loss, backgrounding and animation alone never clear history. Restored
content after restart has empty history; do not present route restoration as history recovery.

Decision 19 fixes the preview launch destination to the gallery. Do not restore the last open
editor or add a Continue action. Recover durable content and expose recovery/unavailable states;
route restoration does not recover unsaved memory or session Undo history. Explicit external-file
requests follow separately reviewed import handling, never implicit last-editor restoration.

Decision 20 selects most-recently-edited-first gallery ordering without sorting controls.
Only accepted content edits update editing recency; opening, exporting and autosave completion
do not. Specify stable keyboard/accessibility focus during list refresh in design specifications. Persisted
ordering, ties and new/imported-item placement require concrete S02 contracts.

## Selected save-failure exit guard

Decision 49 permits explicit confirmed abandonment of unsaved edits when a route/window/quit
request would end a session after local autosave failure. Offer Retry and Stay (default) alongside
Leave Without Unsaved Changes; no automatic discard. Committed drawing content remains intact.
Bind consent to state/revision, coordinate pending writes, and invalidate stale route requests.
A failed replacement keeps the original session; confirmation alone does not release it.
Stay/cancel preserves session/history/focus. Concrete state transitions and identified design
remain review deliverables; test real native exit flows separately from injected shared cases.

## Reopening viewport (decision 57)

On explicit library open, restore valid device-local position/zoom for that drawing. Without
valid metadata, fit artwork or use the empty-drawing default. Normal launch remains gallery;
opening never restores unfinished gestures, selection or Undo history. Keep this local view out
of artwork/export/recency semantics. S02 defines finite mapping across resized windows/displays
and bounded persistence/failure fallback. Native reopen tests verify the actual shown view,
while semantic tests prove artwork, history and export independence.

## Import completion destination (decision 60)

Successful native import proceeds to opening the independent library copy. Resolve current-session
interaction/save/exit guards before switching and retain it if import/target opening fails.
Only accepted replacement releases old history. Use imported identity and reviewed defaults for
missing local view/tool settings; preserve normal gallery launch without an explicit import.
S02 reviews publication-versus-navigation cancellation and stale results: a published copy may
remain available when opening fails, and the UI must distinguish those outcomes accurately.

## Reopening active tool (decision 61)

After validating local preferences for the opened drawing, restore its last active available
tool and corresponding settings. Initial editor falls back to Pen for new/missing/invalid/
unavailable tool metadata. Do not restore selected objects, unfinished gestures or history.
Native tool indication/focus reflects shared accepted state. This is local presentation/session
setup, not a content edit or change to gallery launch. Future viewer capabilities override it.
