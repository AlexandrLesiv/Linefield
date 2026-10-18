# Native documents and export choices

The owner selected SQLite on 2026-10-16 for the new native format, without legacy drawing
compatibility. This supersedes ZIP/JSON; concrete schema/lifecycle and export contracts still require review; native snapshot + PNG scope is selected (decision 18). A document format stores editable
meaning; an export targets another application or final presentation. Neither is the typed
FFI command boundary. Choosing a standard file encoding does not reintroduce command packets.

## Native format alternatives

| Option | Benefits | Costs | Recommendation |
| --- | --- | --- | --- |
| Plain versioned JSON | Easy inspection, fixtures and debugging; smallest implementation | Large sample arrays, full-file rewrites, awkward future binary assets | Reasonable minimal alternative for preview |
| ZIP with JSON manifest/document | Inspectable schema, compression, one portable file; later assets can be separate entries | Archive validation and full snapshot writes; compression costs | Previous recommendation; superseded by owner SQLite selection |
| SQLite application file | Transactions and incremental updates; useful for much larger documents | Schema/connection lifecycle, backup and checkpoint policy; sidecar/file-provider considerations | Owner selected C; concrete schema/lifecycle pending |
| Standard CBOR encoding | Compact typed data without inventing a binary codec | Less directly inspectable; versioning and semantic validation still needed | Consider only if JSON cost justifies it |
| SVG as the native document | Broad vector interoperability and standard tools | Pressure samples, brush versions and app metadata need extensions; other editors may strip them | Prefer as export for this stroke-oriented editor |
| Handwritten binary container | Full layout control | Custom tooling, parser/security and migration burden | Reject for this preview |

SQLite explicitly supports application-file use and transactional updates; its suitability
does not remove the need for a backup and file lifecycle design. [SQLite application files](https://sqlite.org/appfileformat.html).
CBOR is an existing standardized encoding rather than a bespoke packet scheme.
[RFC 8949](https://www.rfc-editor.org/rfc/rfc8949.html).

## Selected SQLite direction; concrete v1 contract pending

Use a versioned SQLite application file. The proposed .linefield extension is still subject to
identity/schema review. No ZIP manifest/document entries or speculative asset subsystem.
Review the Rust binding/library version/license and platform build strategy before installation.
SQLite's upstream implementation is a dependency, not new handwritten C application logic.

Proposed logical data: format/application identifier, schema version, required capabilities,
stable stroke IDs/order, finite f64 coordinates, validated actual samples and pressure presence,
styles/transforms with interpretation governed by the top-level document format version. Decision 24 selects one row per
actual sample with separate stroke-level properties. S02 reviews exact columns/keys/constraints
and indexes; no packed sample blocks or binary sample codec is approved.
Logical canvas units are selected (decision 14). Define exact mapping/bounds, color/alpha semantics,
transform order and lossless ID handling for web consumers. Pixels/DPI/locale must not alter stored geometry.
Predictions, GPU caches and native controls remain transient. Session-only Undo/Redo is
selected (decision 10); its stacks are not serialized. No persistent undo or event sourcing.

Keep the pure engine independent of SQL/filesystem access: it owns document values, semantic
validation, revision and dirty-state policy. The services/storage adapter owns database mapping,
connections, transactions and I/O on a bounded worker. Immutable validated snapshots/deltas and
matching operation results cross that boundary. Incremental writes must preserve revision order;
no SQL query or transaction wait in an input callback. Rendering does not read live SQL state.

### Delegate mechanisms; define application policy

Use SQLite for database transactions, atomic commit/rollback, journal recovery, locking and
consistent database snapshots through its supported APIs. Do not build a parallel journal,
custom database repair engine or raw-copy routine for an open SQLite database. Apply appropriate
configuration and supported storage assumptions; do not promise immunity to arbitrary corruption.

Linefield chooses when/what to persist, maps revisions to successful commits, handles errors,
and owns Save/Save As/Discard/recovery UX. SQLite cannot recover editor changes never submitted
to a durable transaction, decide whether a newer revision is still dirty, or provide drawing Undo
by rolling back an already committed transaction. Recovery of unsaved content needs a reviewed
persistence policy, which may also use SQLite rather than a second custom format. Native hosts
own file selection, access grants and provider publication. Do not require staged replacement
for each ordinary SQLite transaction; use it only where reviewed publication semantics need it.

### Lifecycle decisions required before implementation

- Autosave-to-document is selected separately in R06; see [policy](../autosave.md). Database
  transactions do not define user-visible undo. App-managed draft lifecycle, Save As, recovery candidates and
  provider destinations need explicit commit/association/failure outcomes.
- Select rollback journaling or WAL and synchronous/durability policy for the intended access
  pattern. WAL may hold committed data in a sidecar; copying only the main file can lose it.
  Do not enable WAL automatically or assume every filesystem/provider supports its locking.
- Use a reviewed SQLite-consistent snapshot/backup path for portable copies, rather than raw
  copying an open database. Review backup source revision, busy behavior, cancellation, close/
  checkpoint and destination replacement. No sidecar may be discarded to make a file look clean.
- Ordinary Save may use a transaction; Save As/publication may use staged complete database
  replacement. The former ZIP plan's unconditional whole-file rewrite is no longer prescribed.
  Define atomicity and actual durability for each operation and supported storage provider.
- Storage operations remain serialized per destination, session/operation/revision checked.
  Saving N cannot clean N+1. Failed Open preserves the active drawing; a failed save must not
  report success. Cancellation cannot roll back an already committed transaction/replacement.
- Review future schema migration, backup/rollback on failure and unknown required capability
  handling. Never silently overwrite newer or unrecognized data. SQLite file-format stability
  does not establish compatibility of Linefield's own schema.
- Specify recovery checkpoint cadence, loss window, quotas/retention and consent on restore.
  Recovery is separate from undo history and original-file association; no guarantee of every
  recent edit surviving. Keep unfinished strokes/predictions out of committed recovery data.
- Native/mobile provider access and browser SQLite/Wasm storage need explicit adapters and
  capability checks. Preserve one document schema; do not assume browser file paths/threads or
  silently add a second database owner. Version, memory/bundle cost and permission gaps stay visible.

[SQLite WAL](https://www.sqlite.org/wal.html) documents sidecar/locking considerations;
[backup API](https://www.sqlite.org/backup.html) describes consistent database snapshots.
These references inform review, not an approved journal mode or binding implementation.

### Validation and evidence

Treat documents as untrusted databases. Review defensive connection settings, trusted-schema
behavior, extension loading disabled, accepted schema objects and bounded fixed queries.
Never execute SQL provided as document content or interpolate untrusted values into queries.
Set file/page/blob/row/sample/coordinate and processing-time limits; reject malformed schema,
unsupported versions, unexpected executable schema objects and invalid semantic data before
replacing the session. Integrity checks alone do not validate drawing semantics.

Test corrupted/truncated/oversized files, disk full/permission failures, lock contention,
interrupted transaction/backup/replacement, stale completions and failed migrations if provided.
Check that a declared portable copy reopens independently without source sidecars. Measure
large-document load/save/recovery and peak memory while drawing, on actual supported storage.
Legacy NSKETCH1 is unsupported, not migrated. Test data must be disposable.

## Export choices

| Export | Useful for | What is lost or complicated | Suggested milestone |
| --- | --- | --- | --- |
| PNG | Images, issue reports, sharing; lossless pixels and transparency | Raster resolution is fixed; no editable strokes | Selected preview export (decision 18) |
| SVG | Scalable diagrams and vector-editor exchange | Stroke outlines remain editable shapes, not original pressure/brush behavior; textured brushes would need a future fallback policy | Deferred; not approved for preview |
| PDF | Print and broadly readable documents; vector paths where supported | Requires page bounds/units; app editing semantics do not survive | Following milestone |
| JPEG | Compact opaque images | Lossy edges; no transparency or stroke data | Defer until needed |
| TIFF | Raster production workflows | Large files, no vector editing benefit | Defer |
| PSD | Layered raster workflows | No layers in this preview; additional mapping and implementation work | Defer |
| DXF | CAD and manufacturing exchange | Unit/topology conventions and limited brush fidelity | Defer |

For pressure strokes, export the computed silhouette as a filled SVG path. SVG supports
filled outlines; pressure appearance does not require every output element to be a
constant-width stroked centerline. It will not preserve native pressure-editing semantics.
[SVG paths specification](https://www.w3.org/TR/SVG2/paths.html).

Use the same canonical geometry for rendering and export, with explicit approximation
tolerances. Emit a conservative SVG subset without scripts, external references or embedded
app commands. Check it in an independent SVG consumer. Export is one-way in this milestone;
SVG/PNG import is not implied by supporting export.

Decision 36 selects all artwork bounds including visible stroke widths/transforms plus a small
documented margin; no viewport option or crop tool. Decision 38 selects fixed pixels per logical
canvas unit, independent of editor zoom/display density; decision 80 fixes the multiplier at
one pixel per logical canvas unit. Decision 81 sets a fixed 16-unit margin on every side of
full visible artwork bounds. Decision 109 uses these padded bounds as the origin and rounds
width/height upward to whole pixels, without world-grid snapping. This does not set thumbnail margins.
No pixel-size/preset/DPI controls. Validate empty drawings,
extreme offscreen marks and output resolution before allocation. Decision 37 selects an opaque
background matching the fixed light canvas, independent of system theme; no transparency option.
Cap pixels, bytes and processing work, and offer a clear failure rather than silently
cropping or downscaling. PNG export may need a separate CPU Skia context owned by the file/export worker;
never move the live Metal context across threads. Review that resource budget in S07E.
Export does not clear dirty state or change the native document's file association.

## How other drawing apps separate these concerns

- Concepts distinguishes its native editable format from PNG/JPG, SVG, DXF, PSD and PDF
  exports, and lets users choose an export region. Its manual warns that specialized brush
  appearances can differ in vector exports. Our lesson: make bounds and fidelity explicit.
  [Concepts export manual](https://concepts.app/en/manual/export).
- Procreate's 5.1 handbook describes its native format as preserving application-specific
  data, while PNG is flattened and PSD supports layer exchange. That is a useful example
  of native-document fidelity versus interchange, not a feature checklist for this app.
  [Procreate sharing handbook](https://help.procreate.com/procreate/handbook/5.1/actions/actions-share).
- Krita documents its native KRA as a ZIP-based file. This supports the practicality of an
  inspectable container; its raster-oriented internal schema is not our proposed schema.
  [Krita native format](https://docs.krita.org/en/general_concepts/file_formats/file_kra.html).

Selected native container: SQLite. Decision 18 selects native snapshot + PNG export for the
preview, after reliable save/recovery. SVG/PDF are deferred; the SVG guidance above is future
planning only. Decisions 36/37 select all-artwork bounds and fixed light background; exact margin,
resolution/color contracts and identified export UI remain unapproved;
selecting formats does not authorize implementation.

## Selected document upgrade behavior

Decision 26 selects automatic supported lossless Linefield schema upgrades with a consistent
pre-upgrade recovery copy. If copy creation fails, leave the document unchanged; failed upgrades
must preserve original recoverability and report the issue. Newer unsupported required formats
remain untouched. Use the staged independent copy for imported documents, never their source.
Concrete migration/rollback/publication/retention contracts remain S02 review work; destructive
conversion and catalog migrations need separate review. This is not legacy Native Sketch import.

Decision 40 selects latest pre-upgrade recovery copy per drawing in steady state. Older copy
retirement waits for validation of both replacement copy and upgraded document. Failure retains
necessary recovery material; temporary files need bounded interruption-safe handling. If there
is insufficient space for protection, do not upgrade. Exact validation/publication/cleanup
contracts and permanent-library-deletion interaction remain review work.

Decision 42 selects UUIDv4 portable document/stroke identity plus database-local integer keys
for relations. Samples reference local stroke keys and ordered indices. Keep ordering explicit
and validate UUID uniqueness/representation in the concrete schema. Local keys are not portable
identity or a cross-file foreign-key mechanism. Exact storage/constraints and independent-import
stroke identity policy remain owner-review work; no custom identifier encoding/generator approved.

## Initial color space and future extensibility

Decision 48 selects sRGB artwork and PNG output for the first release. The reviewed native
format records color-space semantics explicitly, independent of displays and native UI theme.
Channel precision, alpha, transfer/compositing and PNG metadata details remain S02 contracts.
Future Display P3/other spaces may be considered through a reviewed format/version extension;
existing sRGB drawings must retain their meaning. Do not silently reinterpret stored values or
treat unsupported future spaces as sRGB. No wide-gamut/HDR feature or profile-selection UI now.

## Export revision policy

Decision 51 selects the latest completed artwork for native-document and PNG exports, including
completed unsaved edits. Capture a consistent immutable revision; later edits do not alter that
artifact. A native snapshot of the saved database alone is insufficient when newer artwork exists
in memory. S02 reviews bounded construction/publication of the independent SQLite export.
Export success leaves library pending/failure/durable-revision state unchanged. Exclude transient
interaction/prediction/selection state; export availability during a gesture remains for review.

## Empty-drawing PNG output

Decisions 53-54 permit blank PNG export of empty drawings at exactly 1920 x 1080 pixels. Use the opaque fixed light background and sRGB; output is independent of
viewport/window/display. This fallback does not impose a page on the document or change nonempty
all-artwork bounds/scale. No size controls are added. Native empty-document export remains valid;
active editing gestures still block both export types.

The empty output dimensions are final pixel dimensions: no extra margins or multiplication by
zoom, display density or the nonempty pixels-per-logical-unit export scale.

## Existing export destinations

Decision 63 requires explicit replacement consent in the native save workflow for native/PNG
exports. Prepare/validate output before replacement; failures before publication preserve the
existing file. S02 reviews staging, provider capabilities, replacement/durability, target races
and cleanup without promising universally atomic behavior. App-managed live databases/catalogs/
sidecars are not ordinary export destinations. Import source preservation remains unchanged;
a later explicitly selected export replacement is a separate action, not source write-through.

## Native filename extension (decision 67)

Native drawing exchange uses .linefield. Validate internal format/schema/capabilities and limits
regardless of suffix; unrelated SQLite or malformed data renamed .linefield must not be accepted.
Review native panel/default-name and extension edge cases in S02/S06. OS type/MIME/association
identifiers are not selected or registered by this decision; internal catalog/sidecar naming
is not a new public drawing format.

Decision 71 removes independent per-tool/brush version storage from the plan. The top-level
native document format version governs artwork compatibility; catalog-only settings use the
separate local catalog schema version. Store document/stroke/tool UUIDs as standard 16-byte binary
values with reviewed validation/conversion. Preserve old artwork semantics through explicit
format compatibility/migration rules; never reinterpret saved values silently.

Decision 72 selects STRICT tables in the native document and local catalog, requiring verified
SQLite 3.37 or newer. This is a runtime/schema compatibility requirement, not a new file format
or tool-version scheme. Preserve explicit constraints/Rust validation and reviewed migrations;
future browser builds must demonstrate support before claiming interchangeability. No silent
fallback to permissive tables. Exact schema source/physical DDL still require owner review.

Decision 106 selects normalized floating-point sRGB channels in native documents. Exact float
width, alpha and conversion semantics remain schema review; do not quantize native values to
8-bit just because a host widget/output uses that representation. PNG channel depth is separate.
Decision 108 preserves stroke drawing order through move/scale and native/PNG output.

Decision 120 selects 8-bit PNG color channels. Native document sRGB channels retain approved
normalized floating-point precision (106). Specify output conversion/rounding/metadata and validate
with an independent decoder; never rewrite native colors with export-quantized values. Opaque
background, scale/margins, padded-origin dimension rounding and empty fallback remain unchanged.
Decision 119 imports one coherent captured external revision even if the source subsequently changes.
