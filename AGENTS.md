# Linefield agent instructions

## Current workflow adoption — 2026-10-19

Decision238 adopts native SVG diagram style v2 and one executable task / one branch / one PR.
Follow docs/workflow/task-pr-chat-plan.md and docs/reviews/workflow-style-approval-2026-10-19.md.
Milestones contain bounded child tasks. Harness owns scoped implementation/tests/specialist and
independent review; owner reviews/merges. Verify integration after completion notification, then
provide a concise next-task prompt for a fresh chat. Replacement chats first stop/transfer the
prior writer. Use one implementation writer per leaf task; do not create competing branches for it.
Decision239 permits independent task branches/worktrees while PRs await review. Follow
docs/workflow/parallel-tasks.md; declare dependencies/owned paths and serialize shared contracts.
Current diagrams are generated native SVG from shared definitions and DTCG style tokens.
Database review uses the same pipeline; previous hosted-tool requirements are superseded.
Owner authorized bootstrap and public reviewed source/docs to AlexandrLesiv/Linefield; private
captures/credentials/local backups remain excluded. No feature main merge or release is implied.

## Current owner direction — 2026-10-18

Design work uses versioned repository specifications, shared resources, reference images and the live web prototype. No external design-service account, file, connector or editing access is required. During this session the owner authorizes autonomous work through tasks/ until their return or09:35 Europe/Kyiv on2026-10-18. Preserve concrete architecture/security/product approval boundaries. Do not use Computer Use, foreground automation or actions needing explicit human approval; continue independent local work when blocked. Protected agent configuration text may remain stale because sandbox writes are prohibited; this current human instruction overrides it.

## Scope and authority

Read docs/RESUME.md, docs/objectives.md, docs/decisions.md and the assigned task first. This project's instructions govern Linefield; old repository tasks and ancestry rules are historical reference, not successor requirements. Human instructions take precedence.

Current authorization covers documentation/folder scaffold, root Node.js/TypeScript/pnpm development tooling, shared diagram generation, and the explicitly owner-requested apps/web Vite/TypeScript live gallery prototype (decision 214). Prototype UI, manifests and browser tests are authorized within docs/design/live-web-prototype.md. Real drawing engine, persistence, native applications and additional product behavior still require explicit authorization. Never interpret a task file as broader implementation approval.

macOS remains the primary product target: Swift/AppKit host and a custom Skia canvas. Develop web first because the owner has the most web experience, then macOS, with iPhone/iPad the next native priority. Shared Rust document/geometry/editing/persistence semantics and Skia/CanvasKit remain selected. First preview includes pen, pan/zoom, single-stroke select/move/uniform-scale/delete, undo/redo, open/save/recovery. No legacy document compatibility. Multiplatform planning and apps/ placeholders are authorized from day one; other platform features follow macOS, except web which leads implementation. See docs/platforms.md. Distribution, rotation/multi-select, agents/network features and exports require their own scope approval. Platform implementation still needs its reviewed task/design and implementation authorization. Preserve existing macOS color-control behavior until a concrete replacement is reviewed; its native appearance is no longer mandatory.

## Shared visual direction (decision 232)

Use one consistent Linefield visual system across all platforms. Mandatory Liquid Glass,
Material, Fluent or other OS-specific appearance requirements are superseded. Retire the
tool/preset wheel; desktop drawing direction is a left tools rail and top contextual settings.
Earlier wheel and native-style gallery studies remain historical evidence, not requirements.
Keep adaptive layouts, native input/text/IME/focus/accessibility, OS-owned panels and system
preferences. Host toolkits remain selected; this is not approval of a universal widget engine,
all-Skia chrome, new product behavior or a gallery rewrite. Shared style authoring stays in
trusted data-only TypeScript with generated host resources; moving styles to Rust is not
required or selected. Rust owns editing/document semantics. Follow docs/design/foundations.md
and shared-resources-plan.md; the existing feature/design review/implementation gates remain.

## Design and architecture gates

The owner approves an identified design version/states before new native/product screens/tools are implemented. The explicitly requested live web design prototype is authorized as a design review artifact; it is a review artifact, not native implementation approval. ui_ux_designer owns behavior/navigation and visual/adaptive/motion design together. The lead coordinates the integrated review and platform feasibility per docs/design/roles.md. Repository specifications, approved reference assets and running web prototypes provide the design handoff; no external design-service access is required.

Typed FFI with generated declarations is the selected direction; shared Rust commands remain authoritative. Concrete ABI, document schema, state ownership/thread topology, framework/security changes require explicit owner review before implementation. General scaffold/refactor authorization is not that review. No custom binary command protocol or speculative transport.

Input adapters translate system input/shortcuts/control actions into shared Rust commands. Native text editing keeps first-responder priority. One execution owner mutates each editor; immutable snapshots cross worker boundaries. Separate durable document, session, viewport, native presentation and disposable rendering caches.

## Selected drawing-screen handoff

Decision234 authorizes the next web UI prototype slice P05-D01: implement the owner-selected
slim left rail/top settings screen from docs/design/drawing-screen-v2/reference.png. Read the
v2 screen contract and task; do not revive the archived circular v1 proposal or ask again for
its approval. Tool/property affordances here are UI-only, not real editing/persistence/native
implementation approval. Archived explorations and old RESUME are indexed in
docs/design/archived-explorations.md; current handoff is docs/RESUME.md.

## Live web prototype conventions

Within apps/web, author styles in Vanilla Extract .css.ts with semantic theme tokens. Use exported
local style()/styleVariants classes bound explicitly to owned DOM elements. Reserve globalStyle for
reset/document defaults, root theme and genuine document-level scrollbar behavior. Stable query hooks
are not styling selectors. Do not reintroduce parallel plain CSS styling or global component rules. Keep English and Ukrainian in separate catalogues using stable semantic IDs and typed named placeholders. Author trusted data-only TypeScript catalogues; see docs/design/shared-resources-plan.md for generation invariants and platform boundaries. Browser/OS selects locale/theme. Use the same responsive Web gallery pattern everywhere (decision233). Remove platform-query simulation and hidden review switches; all live cards use ellipsis actions. Preserve browser context-menu/long-press behavior. Future native viewer capabilities remain separately reviewed. See docs/design/live-web-prototype.md.

## Quality requirements

Handwritten source/tests/scripts: at most 200 physical lines after formatting, including comments/blanks. Explicitly exclude generated/vendor code, lockfiles and data. No compressed statements or arbitrary numbered splitting; cohesive responsibilities matter. Documentation is not source code.

Use Node native TypeScript .ts ES-module automation, strict type checking and Oxlint/Oxfmt when tooling is installed. Use strict erasable types, explicit .ts imports and import type. No runtime enums, parameter properties, decorators, any casts or type-check suppressions; no transpiler for owned automation. No owned shell/PowerShell/Python orchestration. Rust/Swift native build tools and upstream Skia C++ remain legitimate dependencies. Pin actual verified tools; do not call planned gates installed or passing.

Every behavioral change names acceptance/invariant IDs and adds appropriate core, boundary and real native E2E tests. Record exact revision/build, platform/device, discovered test IDs, result and artifacts. Missing/skipped/flaky/stale evidence is not pass; replay is not native E2E. See docs/quality.md and quality/README.md.

Instrument native intent origins, central command outcomes/state transitions and worker operation boundaries with structured correlated diagnostics. Allowlist metadata; no content, raw coordinates, paths, credentials or serialized documents. No per-sample production logging. Bound queues/logs/caches; drain logs off input callbacks, count drops/sink failures without failing successful edits. Test redaction, correlation, overload and failure behavior.

Require ordered actual samples, transient predictions, atomic batch validation, cancellation without commits, one-operation undo, revision-safe saves and native field shortcuts. No blocking file/GPU waits on input callbacks; no silent input loss. Worker completion must match session/operation/revision. Recovery and surface failures are required behavior, not later polish.

## Agent workflow

Lead owns scope, architecture coordination and integration. Use configured specialists for scoped work. ui_ux_designer specifies and reviews interactions, native visual design, adaptive design and motion; rust_engine owns shared semantics and typed boundary; macos_ui owns AppKit; rendering_performance owns measurements; build_reliability owns runners/evidence; fresh reviewer independently reviews substantive changes. Platform roles may review portability/design now; web leads implementation, while other native hosts follow macOS and their approved task/design. Keep shared semantics native/Wasm compatible, isolate OS storage/executor/render backends, and never make AppKit/Metal assumptions part of universal contracts.

At most three concurrent subagents and two implementation writers; independent ready tasks may be in flight. Assign outcome, base commit, owned paths, dependencies/contracts, acceptance IDs, required evidence and stopping condition. Freeze contracts before parallel writers; one contract owner. Use isolated worktrees within this repository, not the reference repository. Do not delegate recursively without a specific approved independent task and capacity.

Implementers own feature tests and logging. Do not add permanent architecture/logging/test agents to replace that responsibility. Lead diagnoses after two unproductive repair cycles. Designer/reviewer agreement is not owner approval for a new feature or material architecture decision.

Background builds/checks may run when implementation is authorized. Ask before reserving desktop focus for native automation, simulator interaction or benchmarks unless a current explicit reservation applies. Old permissions/reservations do not carry over. Do not change system security settings, reset trust or use Finder to bypass a permission blocker. Continue independent work if blocked.

## Completion

Keep reference source read-only at the pinned revision; selectively copy only after implementation authorization and record provenance/license/tests in docs/reuse-ledger.md. No symlinks, submodules or absolute build dependencies on the old project. Do not import old pass claims, cached products or unfinished task statuses.

Local task commits are permitted when authorized work is ready. The owner approves main merges and release publication. Present a running app only when it exists, with designer review, fresh review and exact-build verification. Never weaken tests, budgets or thresholds to get green. Until actual commands exist, report checks as planned rather than inventing a build command.

## Contracts and shared E2E

Follow docs/contracts.md and docs/testing/shared-e2e.md. Each behavioral task names CT contract,
INV invariant, SU acceptance and scenario IDs; record concrete owner, examples, rejection/failure
cases, ownership/threading/bounds and required conformance before implementation. Material
ABI/schema/topology/security choices still require owner review.

Share scenario semantics, fixture expectations and evidence formats across platforms. Native
drivers perform actual UI actions; dispatcher injection is integration/replay, not native E2E.
Keep platform-specific focus/gesture/lifecycle/accessibility tests. Capability-based exclusions
need reasons and viewer enforcement cases. Semantic file assertions do not replace visible
render checks. Never normalize meaningful differences or hide retries/skips/stale evidence.

Start with native framework tests and small helpers; extract shared abstractions when the
second platform demonstrates reuse. No speculative universal automation DSL or command protocol.
Implementers own feature scenarios/tests; build_reliability owns discovery/reporting, rust_engine
owns semantic conformance, designer reviews native expectations, reviewer audits evidence labels.

## Logging, tooling, design review and developer experience

Follow docs/logging.md, docs/tooling.md, docs/design/workflow.md and docs/developer-experience.md.
Use Node native .ts automation and Vite for browser/Wasm asset integration, with separate
strict type checking and Oxlint/Oxfmt. Vite does not compile Rust and Node does not type-check.
zx is optional, not mandated: it uses a shell; default to Node APIs and argument-array process
launching. Do not introduce embedded shell programs or a universal zx dependency implicitly.

Zed tasks are the owner-selected integration, not a custom extension. Plan reusable action/
report data now; create real launchers only after commands exist and implementation is authorized.
Later GUI/CI views reuse that data and presentation without making apps depend on dev tools.
design review approval records name exact version/frames, task/scenario IDs and owner conditions;
mutable links alone do not prove approval. The web prototype is implemented; task-runner/workbench status is recorded in their tasks.

## Adaptive design foundations

ui_ux_designer owns S00A including behavioral requirements, following docs/design/foundations.md: shared semantic foundations,
shared Linefield component styles with host behavior mappings, reusable design components/tokens and verified resizable
frames. Approve identified foundations and screen versions separately. Native system controls
retain platform behavior; UI theme colors must not alter saved drawing colors. Map future
platforms now; detail the next authorized web slice first, then macOS. Exhaustive designs for all future platforms are not a prerequisite.
Android TV/Google TV (apps/android-tv) and Android XR (apps/android-xr) are planned hosts;
folders/tasks only, no implementation. TV is view-only; XR starts with reviewed 2D scope.

## Internationalization from the first implementation

Follow docs/internationalization.md, docs/testing/internationalization.md and S00B. Keep Rust
commands/IDs/model/files locale-independent; host presenters use native localized resources
and typed message/error arguments. Externalize app-owned UI/AX strings from the first screen;
use full messages and native plural rules, not concatenation or English-only singular logic.

Native parsers handle localized numeric input with complete validation before typed Rust
commands; core still enforces domain bounds. UI language, region, keyboard and time zone are
separate. IME/marked text and native text shortcuts take priority. RTL can adapt chrome, never
mirror artwork/world coordinates. Preserve Unicode user content/paths and logging privacy.

Require source fallback, pseudo-expanded/RTL layout checks, numeric/IME/Unicode and stable-ID
E2E coverage as each feature is built. Designers include locale variants in design specifications. Translation
completeness/linguistic review/runtime evidence are separate. English (en) and Ukrainian (uk)
are required launch languages on every host; English remains source/fallback. Resolve OS/per-app
preferences at launch (browser preferences on web); no in-app switch. Regional formatting stays
independent. Other languages, translation services and text drawing tools need separate scope.
UX coordinates terminology and proficient Ukrainian review; UI supplies both design review variants;
engineers own catalogs and E2E, build_reliability owns gates and reviewer checks evidence.
Require I18N-LAUNCH-002/I18N-UK-002. No new permanent localization agent is introduced.

## Competitor research

Use competitor_researcher for bounded workflow research before substantial new design choices.
Follow docs/research/README.md and S00C. It provides sourced observations and ranked options to
the owner and ui_ux_designer through the lead; it cannot add features or approve designs.
Designer records adaptation/rejection reasoning; platform engineers assess native feasibility.
Research is not a benchmark, user validation or implementation review. Keep existing agent
concurrency limits and owner scope/design review gates. Do not create recurring monitoring implicitly.

## Motion and navigation

Follow docs/design/motion.md, docs/navigation.md and S00D. Designer specifies interactive
platform transitions, interruption/cancel, reduced motion, focus/AX and native feasibility
alongside static/resizable design review. Owner approval covers identified motion/flow versions too.
Native hosts own presentation/routes; Rust remains authoritative for dirty/save/open/cancel
and capability semantics. Browser URLs/history and native stacks must reflect accepted state;
external links are untrusted requests, never access grants or serialized editing commands.
Do not add a gallery, custom URL scheme or routing framework from an example alone. Animation
cannot delay ink, decide document mutation or be required for semantic completion. Test real
Back/Forward/gestures, races, focus and normal/reduced motion per shared scenarios.

## Wear OS and combined design ownership

Wear OS apps/wearos is a planned target (P12), owned by android_ui for engineering. View-only
is owner-selected (decision 152); toolkit, standalone/acquisition and any network scope still need review.
Decision 213 restores ui_ux_designer; follow docs/design/roles.md. One designer owns journeys,
navigation, interaction acceptance, native visual foundations, adaptive design and motion.
Lead coordinates platform feasibility; no additional coordinator or higher concurrency cap.
Use behavior and visual checklists in one owner review packet. Engineers still own code/tests;
fresh reviewer remains independent. Earlier split-role records are historical.

Autosave to the document is owner-selected; follow docs/autosave.md. Ordinary edits persist
in the background with revision-safe status. Resolve pending/failed writes on navigation;
never interpret Cancel/Discard as reverting already-persisted edits. SQLite owns database
transaction recovery; draft creation and exact persistence scheduling still require review.

## Database design specialist

Use database_designer for scoped SQLite schema design and review per docs/database-design.md.
Require a visual owner handoff: generated native SVG conceptual/physical schema views, table dictionary,
persistence sequence, tradeoffs and migration/test plan. Record approval of an exact proposal
version before schema/migration implementation; material deviations require renewed review.
The specialist cannot self-approve, choose unresolved product behavior or create another mutable
editor owner. rust_engine retains shared command/persistence implementation; existing reviewer,
performance and test responsibilities remain. This scoped role is an explicit owner-requested
addition, not permission to proliferate quality roles or raise concurrency limits.

Decision239 replaces the hosted schema toolchain with generated native SVG from shared schema
definitions and DTCG diagram tokens. Reference SQL remains executable constraint authority;
annotations and documentation-only jobs definitions preserve the reviewed proposal. Future hosts
consume generated shared data only after their implementation approvals. Never duplicate schema
policy in hand-authored diagrams. See docs/database/README.md.

## Gallery-first scope

Owner selected a Procreate-like app-managed library on 2026-10-16. Plan/design S02L as the first
product UI milestone before S04 canvas: gallery entry, unnamed durable drawings, create/open/
rename and reviewed deletion flow. design version and concrete library/schema approval still
precede implementation. Keep one window/editor, shared Rust commands and native presentation.
Decision 212 supersedes decision 8 ordinary deletion UX: stage recoverable removal with in-place Undo until successful departure. Review durable staging/recovery/finalization before code; no general Trash screen. Test cancellation, failures and pending-save races. Do not infer stacks/folders,
bulk tools, sync or external-file write-through.
Minimal library persistence belongs in S02L; S06 extends it. See decision 7 and tasks/S02L.md.

External Linefield files use owner-selected import-as-copy (decision 9): assign a new library
identity, preserve source bytes and never auto-write back. Native imports are not cloud replicas;
future sync remains separate scope. Test failure/cancel/staging and embedded-ID collisions in S06.

Named typed native entry points are owner-selected (decision 12). Keep them thin: translate to
shared Rust commands/queries without duplicate editing/save/Undo policy. Use bounded input batches.
Future web/AI adapters share semantics, not necessarily native ABI shapes. No custom packet
transport or incidental AI/security implementation. Exact signatures/ownership still need S02 review.

## Shared tool interruption rule

Decision 73 requires all tools, including future approved tools, to cancel unfinished interactions
on drawing-window focus loss. Use the shared Rust interaction/cancel contract; restore only the
interaction's pre-state, remove transient previews and create no Undo or partial persisted edit.
Preserve completed work/history and independent worker results. Each tool task must cover cancel,
repeated/stale events and fresh interaction after focus return through shared tests and real native
FOCUS-001 cases. Native text-field/IME behavior retains priority. Do not implement future tools
or run foreground automation merely because this invariant is documented.

Decision 74 also requires shared Rust rejection of document Undo/Redo during every active tool
interaction. Native availability follows shared state; no queued request, forced gesture end/
cancel or history mutation. Restore eligibility from actual history after end/cancel. Keep native
text-field/IME Undo separate and require per-tool command plus native shortcut/focus tests.

Decision 75 blocks tool switching during every unfinished tool interaction. Enforce the guard in
shared Rust and native availability; no queued switch, automatic cancel/commit, other-tool settings
activation or persisted active-tool change on rejection. Test all implemented origins and fresh
switching after end/cancel. Future tools inherit the same guard; native text/IME priority remains.

Decision 76 standardizes canvas Escape across tools: cancel the active interaction through the
shared Rust path; otherwise clear selection; otherwise no canvas action. Keep the current tool
selected and preserve completed history/content. Native dialog/field/IME Escape has priority.
Test idempotence, late/held-input rejection and fresh begin; never intercept Escape globally or
maintain separate cancellation semantics per tool.

Decision 77 blocks canvas pan/zoom during active stroke/move/scale on initial macOS. Enforce
shared admission without queued navigation or forced gesture completion/cancellation; preserve
native field handling. Idle selection does not block navigation, and pan/zoom must not block its
own updates. Test no delayed movement after end/cancel. System resize/display remaps are separate.

Decision 78 requires shared cancellation of any unfinished tool interaction before accepting a
resize/display-induced canvas mapping change. Preserve completed work/history and valid saves;
clear unfinished previews without partial commit. Let system resize/display adaptation proceed.
Define mapping invalidation/ordering in S02, reject stale events and require fresh begin. Window
movement alone is not a trigger if mapping stays unchanged. Require shared tests plus actual
native resize/display evidence or an explicit hardware gap; future tools inherit this rule.

## Batch 1 gallery and input requirements

Decisions 90-93: gallery items load on demand while scrolling, with bounded pages/windowing and
visible/near-visible thumbnail work. Cached previews represent durable drawing revisions. Reserve
layout space so asynchronous hydration cannot shift items, scroll anchors or focus on any platform.
Design/test native placeholder, success and error states across responsive/i18n/AX variants;
legitimate window/text-size adaptations are distinct. Do not eagerly materialize the whole gallery.
Initial preview renders actual input only; future prediction contracts are not implementation or
acceptance evidence. Preserve shared Rust authority and require separate real E2E per host.

## Selected quality workflow (decisions 110-115)

Plan screenshot baselines at every suitable E2E step; justify gaps and require reviewed per-host
capture/tolerance metadata. Never auto-accept goldens or hide loading/layout changes. Designer and
functional/AX/semantic reviews remain required. Use targeted video for motion/gesture diagnosis,
not routine recording of every run or unaccounted recording during benchmarks.

Performance acceptance requires reviewed absolute and same-host relative gates. Keep short bounded
seeded generated/fuzz exploration in relevant background commit checks and longer milestone lanes;
retain failure inputs and exact evidence. No native foreground permission or scheduled automation
is granted by these policies. Build reliability owns runners/retention; implementers own cases.

Prune only eligible old successful test artifacts under reviewed limits; preserve unresolved and
review-pinned evidence/provenance. Stop large capture/request cleanup when protected data fills
capacity. Never include drawings/logs/recovery in this cleanup. Separate unrelated dependency
upgrades; required feature/fix dependencies may accompany changes with explicit rationale/audits.
No new tooling, quotas, bots or implementation is authorized solely by these instructions.

## Multi-process and migration policy (decisions 116-120)

The owner selected multiple processes editing different drawings in one managed library. Preserve
one mutable editor owner per drawing and existing within-process thread ownership. Before code,
S02 must obtain review of actual locks/owner identities/catalog notifications/maintenance/deletion/
crash fencing; policy approval does not authorize an invented IPC protocol or daemon. Use actual
process tests plus separate native UI evidence. Proactive upgrades cannot bypass active ownership
or validated backups. Restore approved recovery copies as explicit independent drawings, preserving
originals. Imports use coherent captured source revisions. PNG channels are 8-bit; native sRGB
values remain floating point. Concrete contracts/design review and implementation permission still apply.

## Durable export policy (decisions 121-126)

Capture completed artwork when Export is accepted, before destination selection. Job-owned immutable
snapshots outlive editor navigation. The owner selected durable jobs/source snapshots for crash
recovery and serialized same-destination exports with valid replacement confirmation. This is not
approval for an invented job protocol/schema/IPC or worker topology: obtain concrete S02/shared schema review,
including access/privacy/durability/retention, ambiguous publication and multi-process fencing.
Preserve independent failures and safe progress; never silently replay an uncertain overwrite.
The selected count is three accepted jobs including reservations, with byte/work limits and
multi-process scope still to review. Pending lifecycle choices must not be inferred by agents.

## Approved ownership refinements (decisions 127-131)

For explicit contested Open, activate the verified owning document window where supported; otherwise
report in-use. No duplicate editor/read-only mode or background focus stealing. Defer busy drawing
upgrades; reject busy deletion without deferred consent. Pause mutation/persistence on lost ownership,
preserve accepted RAM work where possible and fence stale writes. Platform catalog signals are
advisory; revalidate authority and catch up on lifecycle events. Q44 coordination policy remains
unanswered; do not infer B from the owner's portability question. Concrete host/lock/activation/
security contracts still require review. No daemon/custom IPC or thread change is approved.

## Batch 8 durable export requirements (decisions 132-138)

Job metadata uses a separate SQLite DB; snapshots persist after destination confirmation. Capture
still occurs before the panel. Resume only verified safe recovered jobs automatically; uncertain
publication/access or changed targets pause. Clean terminal snapshots only after safe reconciliation
and reference checks; do not promise old-content retry after cleanup. Deleting a source explicitly
confirms cancellation of pending exports, coordinates safely and preserves completed external output.
Three accepted jobs is PER PROCESS, not per library; shared byte/work protections and orphan-job
accounting require concrete review. No job dropping, duplicate execution or invented global cap.
Q44 and batches 9/10 remain pending. Security recommendations are not permission or implementation.

## Approved maintenance and naming policy (decisions 139-143)

Q44 is now A: one logical resumable maintenance owner, with reviewed transfer/fencing and no
always-running service assumption. Q55/56/58 select library-wide automatic names, new imports first
without fabricated edit timestamps, and outer-whitespace trimming for user-entered names.
Q57 B permits coordinated rename through the owning editor's shared Rust command dispatcher,
confirmed only after durable metadata. This is not approval for a custom IPC protocol: obtain
concrete request/authority/failure contract review first. Advisory catalog signals cannot authorize
mutations. Only batch 10 Q59-61 remains issued and unanswered; do not treat historical pending
notes for batches 7-9 as current status. Documentation-only scope still applies.

## Local library, future cloud and sandbox (decisions 144-145)

Use a fixed app-managed local library and plan a future cloud boundary without adding networking.
Keep provider/path-independent identity, offline edits and local durable status distinct from remote
sync. Do not mirror live SQLite/WAL across devices or invent a distributed protocol/trust model.
App Sandbox is required from the first runnable macOS preview; verify narrow entitlements and file
access early, report blockers rather than disabling protection. Automation permissions are separate.
Q60 encryption is still unanswered. SQLCipher/key-management/E2EE discussion is a proposal, not
adoption approval. No system security settings, credentials or dependency changes are authorized.

## Required next review agenda

After the current architecture-policy questions, execute owner-requested S00E (thorough day-zero
security and specialist-role recommendation), S00F (all-platform input/binding/device contract),
and S00G (current sourced store/channel requirements and responsibility matrix). See tasks/README.md.
Keep these reviews before freezing affected design review/S02 decisions; no implementation/publishing implied.

Shared Rust owns command behavior; proposed shared binding profiles still require concrete review.
Native adapters retain platform event acquisition, OS-reserved controls and native field/IME priority.
Do not equate shared policy with identical shortcuts on every OS. Platform engineers own technical
store/security requirements; UX/UI own associated flows and presentation, build reliability evidence,
lead cross-cutting decisions and reviewer independent checks. Evaluate need for a scoped security
specialist, not automatic role proliferation. No new agent configuration is approved yet.

## Encryption choice and next stage (decision 146)

Q60 A is approved: no Linefield application-level encryption, password or encryption-key recovery
workflow for the first preview. Keep OS protections, App Sandbox and redacted diagnostics; do not
add SQLCipher/key hierarchy from earlier explanatory proposals. Future cloud security stays reviewed
separately; never interpret this as disabling OS encryption or omitting network protection.
All issued Q1-61 are answered. Proceed to S00E/F/G and concrete review packets; do not invent further
micro-question batches to meet prior estimates. Documentation-only scope and owner approval gates
for concrete schemas/ABI/mechanisms and identified design remain in force.

## Recorded language/product direction and S00E proposal

Decision 147 selects OS-selected supported app language at launch, English fallback, independent
region/keyboard and no custom picker. Decision 148 records Concepts-inspired open-source editable
vector sketching, MacBook first. Do not infer Concepts feature parity, license choice, proprietary
asset reuse or future touch-Mac hardware/API availability. Preserve approved preview scope.

Review docs/security/day-zero-review.md and gates-and-response.md for affected slices. Implementers
own feature security cases; use scoped independent review at import/IPC/FFI/persistence/native-dependency
boundaries. Exact mechanisms remain owner-reviewed S02 proposals, not automatic adoption of XPC,
new process isolation, crypto or scanners. No new security agent configuration is authorized yet.
Security scan output and human/agent design review are not runtime proof or a security guarantee.

## Approved ongoing security workflow (decision 150)

Follow docs/security/development-workflow.md for task security-impact classification, sensitive-boundary
review triggers, independent design/change assessment, implementer-owned negative tests and evidence.
Lead ensures required review happens; author self-review is not independent. Material trust/ABI/
protocol/privilege changes still need owner approval before implementation. New sensitive changes
cannot wait until release for security review. Missing reviews/tests stay pending, not green.
Existing engineers own security implementation; reviewer receives an explicit security assignment.
No new permanent implementation/security agent is selected; propose a dedicated review role only
if workload warrants, especially before cloud, and obtain approval before configuring it.
Automated gates remain planned, not installed. Use editable vector sketching app as product wording.

Use tasks/_template.md security sections for every new or activated implementation task, and
quality/security-review-template.md for independent design/change assessments. Lead confirms impact
classification before code. Sensitive work references actual applicable approvals; implementation
includes negative acceptance/evidence; complete status requires independent change assessment and
resolved findings. Do not fill placeholders with guessed consent or call the not-yet-installed
validator enforcement. S01 owns future record validation, not architectural approval.

Automated gates and threat-model maintenance are explicit in docs/security/development-workflow.md.
For affected changes, include a versioned threat-model delta (or specific unchanged rationale), stable
SEC IDs, mitigation/evidence status and review trigger. Independent reviewer compares it to actual
changes. Preserve initial hashed assessment history. Required failed/missing/stale gate evidence or
missing threat updates prevent affected acceptance; do not silently bypass them. Build reliability
owns future local Node gate actions/reporting; current documentation is not installed automation.

## S00F input and S00G distribution review packets

Read docs/input/README.md and docs/distribution/README.md for affected tasks. New default bindings,
touch arbitration and profiles remain proposals until owner approval; preserve selected active-tool
and native focus/IME guards. ui_ux_designer owns behavior and identified design; engineers own feasibility/shared commands. Record actual native/hardware coverage separately from replay and accessibility claims.

Platform engineers own technical channel requirements; build reliability owns artifacts/provenance;
UX/UI own necessary user flows/disclosures, lead current applicability and reviewer independent checks.
No extra store agent. Cite dated requirement IDs/evidence, recheck effective policies before release,
and distinguish preview from shipping. Flathub currently restricts AI-assisted manifests/submission:
if selected, stop before agent packaging or submission and require human handling under current rules.
Do not silently add encryption, permissions, accounts, payments or automatic platform rollout to meet
hypothetical store rules. Owner approves material changes and actual distribution separately.

## Feature-level input planning and viewer scope (decisions 151–152)

Use docs/input/inventory.md as a UX checklist, not a universal mapping specification. The owner
explicitly deferred up-front shortcut/stylus/OS-action choices. UX proposes applicable inputs and
behavior with each feature/platform, including native app menus/Services, system/window actions,
assistive and lifecycle input. Engineers verify feasibility/shared semantics; UI includes the plan
in identified design; submit to the owner before implementation. Do not resume the P/V questionnaire
or adopt historical matrix defaults implicitly. Existing approved invariants remain binding.
watchOS, tvOS, Wear OS and Android TV/Google TV are owner-selected view-only hosts. Enforce content
mutation rejection in shared Rust; no pen/keyboard/agent path can unlock editing. Toolkit, acquisition,
standalone/network, XR scope and code authorization remain separate.

## Assigned distribution ownership and on-demand milestone reviews

Existing platform/Rust/rendering/build/UX/UI/reviewer roles own the technical recommendations,
implementation within approved scope, tests/evidence and upkeep in docs/distribution/channel-strategy.md.
Lead owns cross-platform integration/applicability and explicitly assigns Linux/web/Apple-viewer work.
Responsibility is not permission to select material architecture, channels, license or release terms
for the owner. See docs/owner-responsibilities.md; prepare coherent reviewable proposals first.

Use $linefield-review for requested milestone/architecture audits, or follow docs/workflow/milestone-review.md.
Delegate scoped read-only reviews in waves within existing limits; include independent review,
record actual participation/snapshots and report planned/missing evidence honestly. Lead writes one
report and owner-decision list. Do not turn review requests into automatic repairs, foreground tests,
new permissions, accounts, packaging/submission or publishing. No scheduled automation is created.

## Local schema documentation

Decision239 retires the external schema CLI. Use pnpm schema:generate/schema:check/schema:test and
shared diagram tokens; ordinary checks require no authentication. Do not read credentials or move
former CLI settings. Existing remote publication is historical, not a required review destination.

## DB1–DB4 database decision batch

Follow decisions 156–159 and docs/reviews/S02-db-batch-1.md: retain three databases with conservative authority-loss recovery; persistent transactional gallery activity ordering; multiple bounded durable rename receipts; Rust-owned localized default-name creation. Do not restore native FormatDefaultName effects. Native hosts still resolve launch language and own general UI resources/parsing; Rust owns only default-name en/uk messages with shared fixtures and Ukrainian review. Numeric budgets, complete typed language handoff, coordination/ABI details and implementation remain unapproved. Never infer lost authority, replay an unknown rename blindly or introduce a fourth database.

## Root tooling exception and commands

Use root package.json/pnpm-lock.yaml; do not recreate nested documentation packages or npm
lockfiles. Run pnpm install --frozen-lockfile with lifecycle scripts disabled, then pnpm check.
Diagram/schema generation and drift checks are local and credential-free. See docs/tooling.md and
docs/database/README.md. App/native implementation gates remain separate from documentation tooling.

## Multi-client and future sync direction (163–166)

Follow docs/architecture/incremental-collaboration.md and tasks/S02M.md. Multiple local clients edit incrementally through one authoritative Rust coordinator/database writer. Do not create independent whole-document autosaves per client or prohibit all second clients based on the ownership lock. Scope interactions, previews, selection/viewport and reviewed Undo per client; one client's focus loss must not cancel another's work. Exact conflict/hosting/failure/acknowledgement rules need review.
Use in-process calls, reviewed native IPC or browser messaging as appropriate; NSXPC is not universal. Keep typed FFI in-process, viewer enforcement and platform lifecycle/VFS gates. Future cloud sync initially warns and offers explicit version-checked replacement; no automatic merge, blind force overwrite or implicit cloud implementation. Recovery-copy policy and identified conflict design review remain review gates. Old single-client/rename-only drafts are incomplete.

Decision 166 (2026-10-16): prioritize preventing data loss over automatically reconciling every edit. Preserve conflicting work and resolve explicitly. Local incremental coordination (163) and platform adapters (164) remain selected. Initial future cloud sync preserves both whole-document versions; automatic semantic merging and object-level conflict review are deferred. Concrete preservation/retention/failure contracts and identified design approval remain required; no application implementation authorized. Preserve both conflicting document versions before destructive resolution; block replacement if required preservation fails. Revalidate exact local/remote versions after confirmation. Define bounded retention and explicit cleanup rather than silently evicting unresolved unique work. Pending memory is not a durability guarantee. Advanced merge research is not an initial implementation dependency.

## Completed database policy batch (through decision 180)

Decisions 177–180 close the current policy batch: DB17-B uses SQLite FULL with fullfsync=OFF and checkpoint_fullfsync=OFF on macOS, without claiming identical cross-platform durability. DB20-A validates whole-stroke mutation state; DB21-A starts a fresh Undo/Redo session after coordinator recovery only after reconciling/preserving pending work; DB22-A permits proven-independent commands and pauses dependent/uncertain ones. Exact schema/ABI/budgets and UI remain review items. Read the current status at the top of docs/RESUME.md; older appended open-question notes are historical. Do not re-request settled DB1–DB22 choices. Concrete schema/interface review and implementation authorization are still separate gates.

## S02 v2 approval (decision 181)

The owner approved the consolidated schema, typed interfaces, recovery transitions, provisional resource limits and test plan on 2026-10-16. Follow docs/reviews/S02-v2-approval-2026-10-16.md and its exact snapshot evidence. Do not reopen approved choices. Signed/sandboxed IPC discovery, persistent native file grants, future browser/platform feasibility, design review and actual runtime evidence remain gates. Design approval does not start application implementation or authorize material deviations.

## Authorized feasibility checks (2026-10-16)

The owner authorized native IPC/file-access feasibility checks after decision 181. Keep disposable probes isolated from product code, use synthetic fixtures and background/headless execution, and preserve limitations. This is not application implementation, production entitlement/transport approval or a desktop reservation. Engineering budget recommendations beyond decision 181 remain proposals in docs/reviews/engineering-budgets-v1.md.

## Selected platform IPC defaults (decision 182)
The owner delegated transport selection. Follow docs/architecture/platform-ipc-defaults.md and docs/distribution/ipc-compatibility.md; do not re-open transport choice without evidence. Direct typed Rust calls remain the in-process default. macOS has a narrow discovery-only sandboxed helper exception to no-extra-service; no helper registration/installation is authorized by documenting it. Keep private mobile services conditional, viewers read-only, browser writer authority tied to the actual worker lock, and OS IPC distinct from cross-device sync. Store compatibility has packaging/consent/security conditions, not blanket approval. Engineers own negative/lifecycle/packaging tests and redacted diagnostics; new implementation/UI still follows existing gates.

## Latest coordinate, budget and watch selections (193–195)

Region addresses plus local coordinates replace the global-coordinate-only direction for
affected contracts. Lead/Rust owns the concrete contract proposal, database_designer shared schema definitions,
rendering_performance precision validation, and reviewer independent assessment. Obtain owner
review of concrete schema/ABI/normalization/cross-region transforms before implementation;
do not rewrite S02 v2 historical approval hashes or treat direction approval as exact signatures.
Platform budget profiles are selected provisional caps, not measured safety/RSS guarantees.
Each port reconciles subordinate allocations, memory pressure and GPU/framework overhead.
WatchOS initial viewer uses advance Keep on Watch image downloads, native offline display
and persistent downloaded revisions; no nearby phone is required for completed downloads.
Ordinary cache eviction cannot remove explicit offline downloads. Concrete package/detail/
disk/security contracts and identified design remain required; no live streaming is approved.
Wear OS rendering/acquisition remains separate. See decisions 193–195 and P08.

## Coordinate contract completion (decisions 196–201)

RC1–RC6 are selected: signed i64 region addresses; 65,536-unit regions; region/local
positions per stored sample; Rust normalization; tested per-stroke precision envelope;
native canvas-local pointer samples mapped centrally by Rust with a captured mapping
generation. Native event-to-view conversion remains host-owned. Reject stale mappings;
preserve original samples, cancellation, stroke identity and one-operation Undo.
Region size is not a stroke-span cap or page boundary. Exact supported span needs evidence.
Future agent/document commands can use canonical positions without emulating pointer input.
Prepare one concrete schema/typed-interface/transform/conformance packet for owner review;
these directions do not approve exact replacement signatures, columns or runtime code.

## Canonical positions and anchored transforms (decisions 202–203)

All RC1–RC8 choices are settled. Use finite local f64 coordinates [0,65536), checked i64
region carry/borrow and canonical +0 in shared Rust. Source anchor is the first original
actual sample; derive it without redundant source-anchor columns. Store region/local
placement and cumulative positive scale; never rewrite original points for transforms.
The source anchor differs from the UI scaling pivot. Preserve captured-base gesture math,
atomic validation, cancellation and one-operation Undo. Exact schema/typed ABI and numerical
span remain subject to the consolidated owner review and evidence, not implementation by
inference. Historical S02 v2 approval artifacts remain immutable.

## Feature edge cases before implementation (decision 204)

Follow docs/quality.md#edge-case-design-review and tasks/_template.md section6.
Feature owners document concrete boundary/ordering/lifecycle/capacity/native-UX/security
cases, expected outcomes and preserved invariants, accountable owners and test/evidence links
before behavioral implementation. Reuse existing security/scenario IDs; include consequential
combinations and explain relevant exclusions. No quota or exhaustive-coverage claim.
UX/UI cover failure/interruption/adaptive states; engineers own behavior/tests/diagnostics.
Lead assigns independent reviewer challenge for material designs and later implementations.
Missing required outcomes/review/evidence block affected readiness/completion; continue
independent authorized work. Ordinary fixes need proportional review, not new owner consent.
Escalate unresolved product/architecture tradeoffs; never add features to solve a hypothetical
edge case without approval. No new permanent agent, model/concurrency change or automated
validator introduced. Active handoffs must carry this requirement; TOML edits do not prove reload.

## Selected database/mapping amendments (decisions 205–206)

RC9-A and RC10-A are selected directions for the consolidated review packet:
flat region/local sample and placement columns; separate canvas-local and canonical-world
types; Rust-owned viewport mapping and captured-base pointer transform calculations.
Read docs/reviews/engineering-budgets-v1.md for the exact selected proposal. Keep native
event-to-view conversion and metrics reporting in hosts; do not duplicate world geometry.
Do not re-ask RC9/RC10. Exact generated ABI/ownership, visualized shared schema definitions/constraints,
transform UX and precision evidence remain required; no application implementation authorized.
An empty RC11 entry does not select any policy.

## Shared coordinate orientation (decision 207)

RC11-A selects X-right/Y-down for document and normalized canvas coordinates, with
canvas-local (0,0) at top-left and fixed document origin while panning. Rust owns
viewport mapping; hosts convert native event/view conventions, including AppKit orientation.
Region/local Y share direction; RTL never mirrors artwork. Do not re-ask RC1–RC11.
Exact contracts and precision evidence remain part of the consolidated review packet.

## S02 v3 schema review defaults (decision 208)

The owner delegated conservative recommended defaults for the shared schema definitions review handoff.
The v3 source/approval is historical in Git e08f304; current v4.1 review data is
shared/schema/schema.json, with authority/status in docs/database/README.md. Do not
inherit an older approval for changed regional fields. Include saved viewport region/local
centers as well as samples and placement. Preserve exact historical sources/hashes.
Do not restart preference questionnaires for routine defaults within this scope.
Unmeasured numerical stroke-span support remains evidence-gated; no runtime or ABI claim.

## S02 v3 owner approval (decision 209)

Owner approved hosted Version8 and exact regional schema/defaults snapshot; follow
docs/reviews/S02-v3-approval-2026-10-17.md and quality/historical-records.json (Git b0cb531). Preserve reviewed
source bytes; pending wording inside the snapshot is historical, not an unanswered choice.
Do not re-ask RC1–RC11. Exact revised ABI, numerical evidence and feature design review are separate.
Proceed with delegated engineering defaults and coordinated UX/UI review proposals;
schema approval alone is not application implementation authorization.

## Current gallery and Android direction (211–212)

Owner approved Native Gallery redesign artifacts and Android Compose Material 3 planning.
Decision 232 supersedes their mandatory native appearance; preserve these as historical
artifacts and retain Compose as the Android toolkit with shared Linefield styling.
Follow docs/design/native-gallery-v4-plan.md. This supersedes phone/tablet Views references and
ordinary confirmation-based gallery deletion UX above; immutable approval snapshots remain history.
Do not implement production deletion by reusing the old irreversible confirmed-delete intent.
Require concrete staged-removal/recovery/ownership/export contracts before runtime implementation.
Native controls remain platform-owned; Compose observes shared Rust projections and dispatches typed
intent, with no duplicate editor model. Wear/TV/XR toolkit validation remains separate.
Design/test window size independently of platform and device: tablets may be windowed, portrait or
landscape; desktops may have narrow windows. Preserve identity/focus/scroll through adaptation.
Prototype HTML materials are simulations; require native component feasibility and identified design
approval before app implementation. No native desktop reservation is granted by design work.
