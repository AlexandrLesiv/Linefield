# Durable empty-library contract v1

Status: **proposed concrete implementation contract, not production authorization**. Prepared
2026-10-19 against `fbcc30ca115d630d6c9e688b1525d3ee1dcc89d7` plus preserved work. Rust specialist
owns semantics and this document; database specialist reviews SQL/schema conformance, designer
owns visible states, lead integrates browser feasibility and independent security/reviewer results.
Decision237 permits the storage experiment and v4.1 removal direction; it does not make these
new signatures, numerical browser bounds or executable migrations approved.

Scope: create, bounded list, open, rename and reopen **empty** managed drawings in the existing
web gallery and non-drawing host. Rust services own decisions; JS is an asynchronous UI and a
thin synchronous SQLite adapter inside the coordinator worker. No real pen, imports, export,
networking, native host, sample-art conversion, database file picker or production Delete.
Delete remains unavailable in this first implementation slice; accepted v4.1 behavior is retained
for its subsequent implementation. No disposable prototype Delete may touch durable data.
CT-01/03/04/05/07/08/09; INV-01/06/07/09/10/11; SU-09/10/12/13/15/20/21.

Read with [browser storage](../architecture/browser-storage-v1-proposal.md),
[approved command semantics](native-v2.md), [receipts](native-v2-queries.md),
[schema](../database/schema-v3.md), [removal amendment](../database/deletion-v4/proposal.md),
[bootstrap/DDL](../database/empty-library-v1.md), [navigation](../navigation.md) and
[identified empty-library UI](../design/durable-library-empty-v1.md).
This browser-specific declaration proposal does not replace native-v2's C ABI or macOS thread rule.

## 1. Values, identities and allocation ownership

The following are named schema types, not interchangeable strings or executable TypeScript.
`Id` is exactly16 UUID bytes, validated version/variant where UUIDv4 is required. `Counter` is a
nonnegative signed-i64 value, `0..9223372036854775807`; `Time` is signed-i64 UTC microseconds.
Use Rust i64 / JS BigInt / SQLite INTEGER end-to-end, never Number. Checked increments fail
before any write; exhausted generations never wrap or reuse. Local handles contain a runtime
slot and generation and never cross BroadcastChannel. UUIDs identify, but never grant authority.
`Name` is validated UTF-8, at most256 Unicode scalars and1024 bytes after trimming; no NUL,
CR/LF, U+0085/U+2028/U+2029; nonempty. Preserve internal whitespace, normalization form, combining
marks and duplicate display names. Proposed deterministic outer trim set is U+0009–000D,0020,
0085,00A0,1680,2000–200A,2028,2029,202F,205F,3000. No locale-dependent folding or NFC rewrite.
An unpaired JS surrogate is InvalidArgument before UTF-8 conversion, never replacement text.

`CatalogToken={library:Id, incarnation:Id, generation:Counter}`;
`DocumentToken={document:Id, incarnation:Id, content:Counter, metadata:Counter}`.
`Grant` is a runtime-issued authenticated attachment, bound to coordinator generation, client
session, capability and current channel lifetime. Its serialized descriptor is not a bearer
capability. `Request={session:Id, sequence:Counter, operation:Id}` is bound by Rust to the immutable
validated body. `NavigationId={runtimeGeneration:Id, sequence:Counter}` prevents stale delivery.

The adapter owns SQLite/Wasm allocation; Rust owns Rust/Wasm allocation. They share no pointers.
Inputs are immutable borrowed call arguments copied before enqueue or retention. A returned row
batch is adapter-owned, immutable and charged until `releaseRows`; Rust copies checked values
into its owned projection before release. The adapter must copy BLOBs before SQLite step/reset;
views into SQLite memory are forbidden. Each row descriptor carries an explicit type, count and
length; sum/count/multiply checked before allocating. Failed or insufficient-capacity output
returns no partial rows. Duplicate release/stale handle is rejected without freeing live data.

## 2. Named service declarations

```text
libraryStart(effectiveLanguage: En|Uk) -> Pending<LibrarySummary>
libraryPage(token: CatalogToken, cursor: PageCursor?, limit: u32) -> PageOutcome
libraryCreate(request: Request, navigation: NavigationId) -> Pending<CreateOutcome>
libraryOpen(document: Id, navigation: NavigationId) -> Pending<OpenOutcome>
libraryRename(grant: Grant, request: Request, expected: DocumentToken, name: Name)
  -> Pending<RenameOutcome>
libraryQueryRename(grant: Grant, frozenRequest: Request) -> Pending<ReceiptOutcome>
libraryQueryCreate(request: Request) -> CreateObservation
navigationCancel(navigation: NavigationId) -> CancelOutcome
navigationAccept(navigation: NavigationId, ready: ReadyHandle) -> NavigationOutcome
clientDisconnect(grant: Grant) -> Pending<DisconnectOutcome>
```

`Pending` is acceptance into a bounded queue, never a saved result. Observe it through a typed
operation handle or generation-bound completion. The host supplies neither SQL nor managed path.
Launch language is captured once; Rust formats full en/uk default-name messages, ordinal1 without
suffix, subsequent ordinals with the complete localized template. UI language never rewrites a
stored existing name. A create request has no caller-selected name, identity or output locator.

`LibrarySummary={phase, token?, namingAvailable, storageRisk, recoveryState}`. Phases are Starting,
Ready, Recovering, Unavailable; Ready does not imply New is available. `storageRisk` separates
persistent-grant/refused/unavailable from local-commit status. Library startup enters gallery.

`PageCursor={activity:Counter, document:Id}`; page limit1..128, copied row/text payload<=256KiB.
`Page={token, items:[LibraryItem], next:PageCursor?}`; `LibraryItem={token:DocumentToken,
name:Name, activity:Counter, created:Time, contentEdited:Time, availability, capabilities}`.
Availability is Available/Missing/Inaccessible/Invalid/Unsupported/Conflict. A matching version
page is atomic; changed incarnation/generation yields ResyncRequired, never a mixed page. Read129
rows at most to determine continuation, output128 at most. Sort activity DESC, UUID bytes ASC.
Initial request obtains current token; continuation must use that exact token. No unbounded
snapshot is pinned across calls. Advisory invalidation carries incarnation/generation, coalesces,
and triggers bounded resync preserving UUID focus/scroll anchors. This first slice uses complete
bounded pages; fine-grained collection patches are not silently invented.

`CreateOutcome={document:DocumentToken?, phase, catalogProjectionPending, navigation}`; phases
Reserved/DocumentDurable/Published/Blocked/Unknown. Published confirms both validated document and
catalog entry. A published drawing may remain in gallery after its destination is cancelled.
`CreateObservation` is the surviving runtime's frozen-request result or Unknown, not an identity-
only durable receipt. `OpenOutcome` is Ready(ReadyHandle,DocumentToken)/Rejected(reason)/Cancelled.
Ready is a bounded held attachment, not route acceptance or a durable edit. `RenameOutcome` is
Durable(DocumentToken,catalogProjectionPending)/NoOp/Rejected(reason)/Unknown. ProjectionPending
is durable rename success plus incomplete gallery repair; it must not invite repeating the rename.
`ReceiptOutcome` is Pending/Durable(bodyMatchVerified=true,DocumentToken)/Unknown/ArgumentMismatch.
`CancelOutcome` distinguishes CancelledBeforeAccept/AlreadyAccepted/Unknown; accepted durable
writes remain accepted. `NavigationOutcome` is Accepted/Cancelled/Rejected/Unknown; only Accepted
permits the host to commit destination presentation/history. A stale completion releases its own
unused ready handle and cannot replace a later accepted route.

Reasons are typed tags: InvalidArgument, Unsupported, Capacity, InUse, WrongAuthority,
StaleIncarnation, MetadataConflict, ResyncRequired, StorageFull, StorageAccess, StorageCorrupt,
StorageIo, UnknownOutcome, SequenceUsed, ArgumentMismatch, Cancelled, NamingUnavailable.
No English parsing, SQL text or paths reach UI/errors/logs. Host owns complete en/uk presentation.

## 3. Typed SQLite adapter catalogue

Proposed worker-local bridge; generation-checked handles are not native ABI declarations:

```text
begin(db: DbHandle, mode: Read|ImmediateWrite) -> Result<TxHandle, StoreError>
query(tx: TxHandle, statement: QueryId, parameters: Parameters,
      rowLimit: u32, byteLimit: u32) -> Result<RowBatch, StoreError>
execute(tx: TxHandle, statement: ExecuteId, parameters: Parameters)
  -> Result<{changed: Counter}, StoreError>
commit(tx: TxHandle) -> Committed | ProvenRolledBack(reason) | Unknown(reason)
rollback(tx: TxHandle) -> RolledBack | UnusableConnection
releaseRows(batch: RowBatchHandle) -> Released | StaleHandle
```

`DbHandle` is registered as Catalog or Drawing(exactDocumentToken,ownerGeneration). No arbitrary
connection/path or SQL-string endpoint. Rust owns a versioned catalogue; generated bindings fix
statement ID, SQL bytes, parameter types, result columns, transaction mode and target database.
Unknown/extra/missing parameters or statements reject before stepping SQLite. The catalogue
fingerprint/build match is checked at worker startup; mismatched Rust/JS builds cannot admit work.
Only integer/finite-f64/text/blob/null values exist; this empty slice has no geometry/f64 statements.
`StoreError` distinguishes Busy, Full, Corrupt, NotDatabase, Access, Io, Constraint, Capacity,
WrongTransaction, WrongDatabase and UnusableConnection. Constraint is an invariant failure unless
a named precondition explicitly expects it. Rollback/close after failed transactions precedes reuse.

There is no await, event callback or reentry between begin and commit/rollback. Transactions are
on one worker and one connection; query results release before commit. One connection has at
most one active transaction; tx IDs are consumed once. Browser replies never carry TxHandle.
Commit success is synchronized SQLite success, not OS/power-loss or eviction immunity. A thrown,
interrupted or missing COMMIT result is Unknown unless rollback is positively established.

The following fixed catalogue covers the empty slice. Colon identifiers are bound values.
`LH` columns are singleton,library_id,catalog_incarnation,catalog_generation,
automatic_name_highwater,activity_highwater,sequence_recovery_state. `DH` columns are singleton,
document_id,database_incarnation,display_name,content_revision,metadata_revision,created_utc_us,
content_edited_utc_us,color_space. `LI` columns are operation_id,document_id,managed_file_id,
operation_kind,phase,expected_database_incarnation,expected_content_revision,
expected_metadata_revision,automatic_name_number,confirmed_utc_us,updated_utc_us.
`DI` columns are drawing_key,document_id,database_incarnation,managed_file_id,display_name,
content_revision,metadata_revision,created_utc_us,content_edited_utc_us,added_utc_us,activity_order,
availability. `RC` is every explicitly ordered command_receipts column in the reviewed schema source.
These column lists are expanded in generated SQL; wildcard SELECT is forbidden. Whole-record
parameter sets use these exact field names/types, with no caller-controlled column selection.

| ID / DB / mode | Fixed SQL contract and typed inputs | Result / maximum |
| --- | --- | --- |
| C01 / catalog / read | `SELECT LH FROM library WHERE singleton=1` | one LH; exactly one required |
| C02 / catalog / read | `SELECT DI FROM drawings ORDER BY activity_order DESC,document_id ASC LIMIT :count` | DI rows; count2..129 |
| C03 / catalog / read | `SELECT DI FROM drawings WHERE activity_order<:activity OR (activity_order=:activity AND document_id>:document) ORDER BY activity_order DESC,document_id ASC LIMIT :count` | DI rows; Counter,Id,count2..129 |
| C04 / catalog / read | `SELECT DI FROM drawings WHERE document_id=:document` | zero/one DI |
| C05 / catalog / read | `SELECT LI FROM lifecycle WHERE operation_id=:operation` | zero/one LI |
| C06 / catalog / write | `UPDATE library SET automatic_name_highwater=:nextName,catalog_generation=:nextGeneration WHERE singleton=1 AND catalog_incarnation=:incarnation AND catalog_generation=:generation AND automatic_name_highwater=:oldName AND sequence_recovery_state='known'` | changed exactly1 |
| C07 / catalog / write | `INSERT INTO lifecycle (LI) VALUES (:LI)` | one complete create record; changed1 |
| C08 / catalog / write | `UPDATE lifecycle SET phase=:next,updated_utc_us=:now WHERE operation_id=:operation AND document_id=:document AND managed_file_id=:file AND expected_database_incarnation=:incarnation AND operation_kind='create' AND phase=:previous` | changed1; Rust allowed phases below |
| C09 / catalog / write | `INSERT INTO drawings (DI) VALUES (:DI)` | validated new projection; positive allocated drawing_key; changed1 |
| C10 / catalog / write | `UPDATE library SET activity_highwater=:nextActivity,catalog_generation=:nextGeneration WHERE singleton=1 AND catalog_incarnation=:incarnation AND catalog_generation=:generation AND activity_highwater=:oldActivity` | checked Counter inputs; changed1 |
| C11 / catalog / write | `UPDATE drawings SET display_name=:name,metadata_revision=:nextMetadata WHERE document_id=:document AND database_incarnation=:incarnation AND content_revision=:content AND metadata_revision=:oldMetadata` | changed1 or zero triggers reread, never overwrite |
| C12 / catalog / write | `UPDATE library SET catalog_generation=:next WHERE singleton=1 AND catalog_incarnation=:incarnation AND catalog_generation=:previous` | changed1 |
| C13 / catalog / read | `SELECT COUNT(*),COALESCE(SUM(charge),0) FROM (SELECT 256+length(CAST(operation_kind AS BLOB))+length(CAST(phase AS BLOB)) AS charge FROM lifecycle WHERE operation_kind='create' LIMIT 257)` | one Counter pair; >256 rows rejects New |
| C14 / catalog / read | `SELECT COALESCE(MAX(drawing_key),0) FROM drawings` | one Counter; Rust checks +1 before C09 |
| C15 / catalog / read | `SELECT LI FROM lifecycle WHERE operation_kind='create' ORDER BY operation_id ASC LIMIT :count` | first recovery page; count2..129 |
| C16 / catalog / read | `SELECT LI FROM lifecycle WHERE operation_kind='create' AND operation_id>:after ORDER BY operation_id ASC LIMIT :count` | next recovery page; Id,count2..129 |
| C17 / catalog / write | `UPDATE drawings SET availability=:next WHERE document_id=:document AND managed_file_id=:file AND database_incarnation=:incarnation AND content_revision=:content AND metadata_revision=:metadata AND availability=:previous` | exact projection CAS; changed1, otherwise resync |
| D01 / drawing / read | `SELECT DH FROM document WHERE singleton=1` | exactly one DH |
| D02 / drawing / read | `SELECT RC FROM command_receipts WHERE operation_id=:operation` | zero/one RC; at most4KiB decoded |
| D03 / drawing / write | `INSERT INTO document (DH) VALUES (:DH)` | validated empty header; changed1 |
| D04 / drawing / write | `UPDATE document SET display_name=:name,metadata_revision=:next WHERE singleton=1 AND document_id=:document AND database_incarnation=:incarnation AND metadata_revision=:previous` | changed1 |
| D05 / drawing / write | `INSERT INTO command_receipts (RC) VALUES (:RC)` | immutable rename receipt; changed1 |
| D06 / drawing / read | `SELECT EXISTS(SELECT 1 FROM strokes),EXISTS(SELECT 1 FROM samples)` | one pair of0/1; both zero required |
| D07 / drawing / read | `SELECT COUNT(*),COALESCE(SUM(charge),0) FROM (SELECT 256+length(CAST(command_kind AS BLOB)) AS charge FROM command_receipts LIMIT 4097)` | one Counter pair; >4096 rows rejects mutation |

Identifiers LH/DI/LI/DH/RC are documentation expansion macros, not SQL text accepted from UI.
`SELECT C01` and each command's rereads occur in its transaction. Changed-row mismatch rolls back
all its writes. No SQL statements for Delete, receipt pruning, import, arbitrary repair or geometry
are exposed in this slice. Schema bootstrap/validation is a separate fixed, versioned resource:
reviewed v3 catalog/drawing tables plus approved v4.1 catalog additions, all empty except required
singletons/tool seeds. Jobs DB is not opened. No `ATTACH` or cross-file atomicity claim.

C13/D07 charges are a proposed conservative fixed-row/index accounting unit plus actual variable
TEXT bytes, not measured SQLite heap/disk consumption. Add the proposed insertion and all reserved
unsaved rows before comparing256/1MiB create and4096/8MiB receipt caps. Actual allocations/copies
remain separately charged to browser budgets; successful SQL counts cannot bypass those budgets.
Malformed schemas/fields reject before these queries; capacity sampling reads at most cap+1 rows.
C14 and C09 execute in the same transaction; internal positive row keys are not stable UUIDs.
C15/C16 recovery cursors bind catalog incarnation/generation plus last operation ID. Each page is
coherent, byte-limited to256KiB, and releases SQL before file work. A generation change restarts
bounded enumeration; retain deduplicated operation IDs within the create-ledger cap. Scan does not
authorize mutation: reread C05 and exact target under ownership before every recovery transition.
This permits restart recovery without the dead runtime's operation handle or request ID.

Exact DDL/checks/application IDs and seed constants are now proposed in
[empty-library format v1](../database/empty-library-v1.md) for the final implementation
approval bundle and tested during implementation; this interface does not substitute guessed
DDL or loosen existing schema source requirements. Schema migration implementation is not performed here.

## 4. Create, rename and cancellation transactions

**Create reservation:** before admission freeze UUIDv4 document/incarnation/file/operation IDs,
launch language and timestamp in Rust. Do not precompute a name from an unreserved ordinal.
Acquire drawing ownership then
catalog admission. In one ImmediateWrite transaction C01/C13 check known naming authority and room;
C06 increments name highwater and generation; C07 inserts create/reserved with exact IDs, zero
expected revisions and allocated ordinal, NULL confirmation. Ordinal gaps after failure are legal;
never reuse a reserved number. Release catalog transaction before any drawing-file work.
After confirmed reservation, format and validate the name from that exact allocated ordinal and
the frozen launch language, then freeze it before D03. A failed/unknown reservation never permits
formatting a guessed ordinal or creating a file; reconcile the exact lifecycle first. A formatting
failure retains the reservation as blocked. Two concurrent tabs therefore cannot share a name
ordinal inferred before their serialized reservations. Locale changes cannot reformat this request.

Create the file only in its generated managed locator with exclusive create semantics; existing
bytes are a collision, never overwrite. The file is inaccessible as a library item until validated.
Initialize reviewed schema and D03 with content=metadata=0, color_space=srgb, created/content-edited
both creation time, no strokes/samples; commit, close, reopen and validate exact identity/schema and
empty content. Publish uses a catalog transaction checking exact lifecycle and absence of drawing
projection; C14 allocates a checked key, C09 inserts projection and C10 increments activity highwater/generation; C08 moves
reserved→published in that same transaction. Existing exact projection/published phase is a
reconciled publication and cannot allocate another activity ordinal. No filesystem rename is
required; publication is catalog visibility, not an assumed atomic OPFS rename.

If the runtime survives a lost reply, query the frozen create request and its exact lifecycle/file
binding. After runtime loss, lifecycle records support **recovery**, not proof of the prior caller's
full body: they lack locale/fingerprint fields. Validate existing exact file and complete publication
as recovery; never regenerate a missing file's name in a new locale and claim the old request
succeeded. A reservation with missing/invalid file becomes blocked, retains IDs/ordinal and any
bytes; recovery does not replay New. Empty uninitialized artifacts are not silently deleted.
New explicit creation may proceed independently if capacity/sequence authority remains known.

This version proposes retaining at most256 create lifecycle rows /1MiB logical charge, including
published and blocked outcomes, until separate guarded pruning is reviewed. Reaching the cap
blocks New with Capacity; list/open/rename/recovery remain available. No silent TTL, reuse or
infinite-growth promise. This conservative finite-preview bound requires owner disposition in
implementation scope; it is not an inherited native limit.

**Rename:** acquire or attach through the current document coordinator, including headless gallery
rename. Rust checks grant/capability, incarnation and expected metadata (content need not match for
an independent rename). Repeated operation IDs query D02 and compare the frozen body before any
revision guard; mismatch rejects. Same validated name at matching revision is NoOp with no durable
receipt/revision/history. Otherwise one drawing transaction D01+D07+D04+D05 advances metadata only,
retaining content revision, timestamps, activity and document identity. Receipt base/result content
is current content; result metadata=base+1. Only committed metadata yields Durable.

Then catalog C04/C11/C12 repairs its copy with the confirmed document metadata under the target
owner and catalog lock. If projection has newer metadata, do not regress it; if it disagrees at the
same revision, report corruption/conflict rather than choosing silently. Content/incarnation
mismatch requires full validated resync, not a metadata-only update. Projection failure sets
catalogProjectionPending and schedules bounded repair; a newer rename supersedes the old projection.
Repair always rereads current authority and never replays old callbacks blindly. Opening, renaming,
retries and late projection do not change activity order. This slice has no content edits.

**Availability repair:** an exact target validation may produce Missing/Inaccessible/Invalid/
Unsupported/Conflict; C17 plus C12 publish that status atomically without removing the retained
item or changing its name, revisions or activity. C04 and C01 must still match the inspected
projection under target/catalog authority. Busy ownership, a lost reply or an unattempted access
is not proof of missing/invalid data. Retrying requires fresh target validation. Return to Available
only after exact managed file identity, supported schema, D01 header and D06 empty content validate;
the header must have content_revision=0 for this slice, even if an older drawing now has no strokes.
Nonzero content history is Unsupported before any rename grant, as required by the format validator;
repair a newer valid name through C11 before marking Available in that transaction. Changed
incarnation/content requires conservative recovery, not a normal availability update or blank
replacement. Errors preserve the previous accepted editor; only the unavailable item is affected.

**Rename fingerprint:** private SHA-256 canonical domain `linefield.rename.v1` (UTF-8 length+bytes),
then named typed fields in order: document Id, incarnation Id, expected_metadata Counter, name
UTF-8. Field encoding is u16LE name length+ASCII field name, u8 type(1=Id,2=Counter,3=UTF8),
u32LE payload length, payload(Id raw16; Counter u64LE validated i64 domain; UTF8 raw validated
bytes). Envelope operation/client/sequence/owner fields are compared separately to receipt columns.
No content revision in fingerprint: unrelated content changes cannot rewrite the rename's identity.
Generated conformance must pin byte/hash vectors for en/uk, combining forms, trim and i64maximum.
Digest is not a credential and is never logged, exposed to UI or copied into portable exports.

**Cancellation:** cancel before reservation performs no write; after reservation retain any
committed creation and consumed ordinal. Cancel pending Open stops its route acceptance, not an
already durable New. Cancel requested after rename COMMIT does not restore the old name. Unknown
commit keeps frozen work and controls in reconciliation; never label it failed and repeat with a
new operation ID. Normal runtime receipt query after loss requires the retained semantic body;
full process loss can leave Unknown. UI shows durable current state without claiming an old receipt.

## 5. Ownership, reconstruction and browser uncertainty

One authoritative Rust coordinator/writer per drawing may serve up to8 attached clients; proposed
browser worker limit4 hosted drawings includes headless hosts. A opens Y while B still uses A-hosted
X: A retains X, and Y admission respects the aggregate capacity. Disconnecting one view does not
retire other grants. Owner shutdown stops admission, reconciles pending work and closes databases
before releasing writer authority. Unexpected loss retires grants; surviving clients preserve
pending bodies and reconcile before fresh history. No timeout, visibility event or advisory signal
permits writer takeover. Failed Open leaves old accepted session and focus intact.

The proposed Web Lock order is maintenance → scope (when deletion later exists) → target(s) →
catalog. A coordinator acquires shared `linefield:v1:maintenance` **before** its first drawing
target, retaining that grant until all its hosted drawing connections close, clients retire and
upstream work settles. Opening another hosted drawing reuses that held grant; it never acquires
maintenance while already holding a target without the outer grant. Standalone catalog queries
and mutations take a short shared grant before catalog admission and release after transaction/
upstream work settles. An idle catalog connection may remain open but performs no work without
the grant. A retained/frozen host therefore prevents exclusive maintenance; recovery is deferred.

Reconstruction uses non-waiting exclusive maintenance admission, then non-waiting affected target
grants in canonical order, then catalog. Never upgrade shared→exclusive while holding any target
or catalog lock: stop admission, reconcile and close hosted drawings, release in reverse order,
then attempt exclusive acquisition afresh. Busy means deferred, never forced close/lock stealing.
No holder waits for another target while holding catalog SQL. These proposed lifetime rules need
deadlock/browser proof. Upstream proxy operations must retire before ownership release; failure
to establish STORE-W9 blocks production adoption even when simple reopen succeeds.

Missing/corrupt catalog with managed files triggers automatic staged reconstruction under exclusive
maintenance; distinguish permission/busy/unsupported from corruption. Preserve damaged catalog,
all uncertain files and sources. Enumerate bounded slices (128 entries/1MiB metadata per slice),
validate exact managed identities/schema, record conflicts instead of choosing an editable winner.
Do not mutate source drawings while rebuilding projections. Proposed order for recovered entries
is created_utc_us DESC then UUID ASC, assigned fresh checked activity ordinals; visibly classify
this as recovered order, not recovered historical edit chronology. New catalog incarnation invalidates
all old page/completion tokens. Local preferences fall back independently. Recovered valid unaffected
drawings may open and rename; identity-conflict items remain unavailable.

Without trustworthy old automatic-name highwater, `sequence_recovery_state=unavailable`; New stays
blocked. Never infer a safe next ordinal from names or reset to1. Lost deletion/lifecycle authority
cannot authorize physical cleanup. Preserve files with unresolved removal state and report recovery
limits; do not claim that catalog loss restored a historical Undo set. New catalogue publication
needs its own validated staging/replacement fault tests. The synthetic experiment may stop safely
instead of implementing these production recovery transitions.

Storage admission/queue limits are proposed in the browser packet (32 ordinary requests/8MiB,
4 control requests/64KiB reserve); enforce totals across both Wasm heaps, adapter copies and queued
messages. No accepted operation is dropped. Retry only a proven not-started Busy at most3 times
within1second; Full/Io/Unknown are not Busy. Reserve reconciliation capacity before mutation.
Persistent-storage refusal does not create an in-memory Saved fallback. Browser flush and process
reopen establish only the measured guarantee; clearing site data/eviction remains possible.

## 6. Required boundary cases and implementation acceptance

All rows below are **specified, not run** by this document. Probe results cover only their actual
synthetic mechanism; they are not Rust semantic/bridge or production library acceptance. Rust owns
semantic/property and bridge tests; web implementer owns real headless browser scenarios; database
specialist reviews DDL/introspection; designer reviews visible states; fresh reviewer audits security.

| ID / priority | Trigger/state | Outcome / invariant | Required evidence |
| --- | --- | --- | --- |
| DLIB-01 high | Empty library, en/uk create; two tabs reserve together | Unique IDs/ordinals, unsuffixed1, no duplicate publication; INV-01/11 | Rust/SQL plus LIBRARY-CREATE-001 browser restart |
| DLIB-01a high | Two tabs observe the same pre-reservation highwater; locale changes after reservation | Each name uses its own committed ordinal and frozen locale, never a speculative name | Concurrent create/name fault test |
| DLIB-02 high | Name/counter at bound and just over; signed-i64 maximum/Number narrowing | Exact BigInt or atomic rejection; no wrap/partial rows | Property/boundary; CT-04/05 |
| DLIB-03 high | Kill at reservation, file commit, reopen, publish and reply | Preserve bytes/consumed ordinal; reconcile once, missing body remains Unknown | Fault grid; LIBRARY-FAILURE-001 |
| DLIB-04 high | Rename duplicate ID/same body, altered body, stale revision, another-client rename | Single durable revision/receipt or exact rejection; pending work retained | Rust/SQL plus two-browser-client scenario |
| DLIB-05 high | Rename commits; catalog Full; newer rename; old repair callback | Durable success plus projection pending, never regression/reordering | SQL fault/property; INV-06 |
| DLIB-06 high | Cancel Open/New, rapid Back/Forward, late ready after newer destination | Old route/session preserved until acceptance; durable New retained | LIBRARY-OPEN/NAV-001 real browser; normal/reduced motion |
| DLIB-07 high | Worker dies with proxy flush queued/in flight; fresh owner requests lock | No stale write after successor admission, or candidate rejected | STORE-W9 actual worker/OPFS; not simulated receipt proof |
| DLIB-08 high | A opens Y while hosting X for B; fourth/fifth host; frozen tab | Retain X/grants; reject excess, never steal | STORE-W2/W10 browser concurrency |
| DLIB-09 high | Missing/corrupt catalog, lost name authority, duplicate identity, busy host | Preserve sources; conservative reconstruction; New blocked, unrelated valid items available | Storage negatives + recovery UI |
| DLIB-09a high | Empty file has content revision5 or nonzero-content receipt | Unsupported before rename; bytes unchanged; revision0 empty file remains eligible | Admission/reopen conformance |
| DLIB-10 medium | Page generation changes, equal activity, missing/out-of-order notification | Atomic bounded page or ResyncRequired; UUID focus/scroll preserved | CT-03 property + gallery browser |
| DLIB-11 high | Wrong DB/tx, unknown SQL ID/type, stale row release, copy-limit overflow/reentry | Reject without touching another allocation/transaction | Generated bridge conformance; SEC-03 |
| DLIB-12 high | Queue/copy/receipt/create-ledger capacity, quota, sink failure | Before-admission capacity failure; recovery reserve survives; successful edit unaffected by logging | Boundary/fault; INV-09 |
| DLIB-13 medium | IME composition, Unicode/duplicate labels, keyboard Escape/text Undo, pseudo/uk | Native text priority and stable IDs; no locale-dependent command mutation | I18N-LAUNCH-002/I18N-UK-002 + LIBRARY-RENAME-001 |
| DLIB-14 high | Viewer/unverified sender/stale coordinator or route ID submits rename | Shared capability/authority rejection, no UI-only guard | SEC-04/05 and INV-10 adversarial tests |
| DLIB-15 high | Restart loses all create request IDs; page changes during recovery | Bounded C15/C16 scan, exact reread before recovery; no duplicate publication | SQL/restart fault and cursor property tests |
| DLIB-16 high | File disappears/returns during status repair; stale error after successful retry | C17 version guard, no phantom replacement or regression; stable card identity | SQL race + unavailable/retry browser tests |
| DLIB-17 high | Recovery requested while another tab retains hosted drawing or frozen grant | No shared/exclusive upgrade inversion; defer without forced close | Real two-tab maintenance/contention test |

Security delta: SEC-01/02/03/07/08 cover malformed files/records, integer/copy bounds, unsafe bridge,
unknown commit and reconstruction; SEC-04/05 cover same-origin channel/owner fencing. SEC-09 requires
names, UUIDs, locators, SQL, receipts/fingerprints and document bytes absent from structured logs.
Use ephemeral correlation IDs, typed operation/state/reason and bounded counts; no per-row logging.
SEC-06 external file/destination access is unchanged because import/export/pickers are absent.
Independent security re-review is required before production boundary implementation.

Real drawing, numerical coordinate normalization, stroke span, pen geometry and scale gestures are
excluded and cannot block the empty-library contract on their own. Production adoption still needs
storage-proxy fencing, exact DDL/bootstrap/schema validation, generated bridge fixtures, identified
durable designs and the owner's concrete implementation approval. No test or exhaustive-coverage
claim is created by this scenario table.
