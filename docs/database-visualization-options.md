# Database visualization options and evaluation plan

Status: evaluated alternatives; owner selected DBML with dbdiagram on 2026-10-16. The comparison
below is historical decision context, not an instruction to reopen selection. No tool is installed,
benchmarked or published. dbdocs and SQLite extraction/check tooling remain optional. Preserve the visual schema approval gate in
[database design](database-design.md). Mermaid ERDs are not required.

## What we need to visualize

- Conceptual model: entities, ownership, required/optional relationships and meaning.
- Physical model: real SQLite tables, types, keys, constraints, indexes and relationships.
- Change review: added/removed/changed structure, migration and possible data loss.
- Persistence behavior: transaction, revision and thread sequence; an ERD alone cannot explain it.

Review proposed structure before implementation. Later regenerate physical documentation from a
disposable database created by the actual migrations. Keep conceptual and physical views labeled;
no inferred relationship should appear to be a database-enforced foreign key.

## Options

### A. DBML with dbdiagram; optional dbdocs

Design the proposed schema as DBML and review interactive dbdiagram views. dbdocs publishes
browsable documentation from DBML. Track source and companion layout files in Git.

Benefits: approachable schema notation, interactive arrangement, focused views, notes and a
review workflow before a database exists. Suitable for the owner's visual design review.
Costs: DBML must remain aligned with SQLite-specific implementation. Hosted access/paid features
need a deliberate choice; a remote link alone is not a versioned approval artifact. The dbdiagram
CLI syncs/publishes but does not render locally. Its documented local preview is in VS Code;
Zed integration is unverified. DBML's own documented CLI dialects do not include SQLite.

Recommendation: strongest candidate for proposal review, with actual SQLite verification later.
Sources: [CLI/layout](https://docs.dbdiagram.io/cli/),
[views](https://docs.dbdiagram.io/diagram-views/), [dbdocs](https://dbdocs.io/),
[DBML conversion](https://dbml.dbdiagram.io/cli/).

### B. SQLite migrations to tbls-generated documentation

After schema approval and implementation authorization, apply migrations to an empty disposable
SQLite database; run tbls to generate Markdown, SVG and machine-readable schema documentation.
Its database/document diff, lint and documentation coverage can support later quality checks.
Documentation coverage is description coverage, not functional test coverage.

Benefits: actual SQLite structure drives the physical diagram; local single-binary tool; outputs
can be reviewed in Git and reused by future CI. Configuration supplies explanatory metadata.
Costs: automated layout needs a readability trial; not a freeform visual schema designer. Fidelity
of SQLite-specific checks/indexes must be tested, not inferred from advertised SQLite support.
Requires an external pinned binary, but no Go application code: owned orchestration stays Node TS.

Recommendation: simplest candidate for generated physical-schema evidence and drift checks.
Source: [tbls official repository](https://github.com/k1LoW/tbls).

### C. SQLite to SchemaCrawler to DBML or local HTML/SVG

SchemaCrawler documents SQLite-to-DBML export using its template workflow. It can also generate
Graphviz diagrams and HTML containing SVG. This offers a bridge from actual SQLite structure
to a dbdiagram review without pretending DBML's own CLI supports SQLite.

Benefits: database-derived structure plus the preferred visual front end; filtered diagrams and
local report options. Costs: additional Java/JDBC tooling and Graphviz for local diagram output;
metadata/export fidelity and preservation of manually arranged layouts require testing. It is
not evidence of a lossless migration generator. Keep annotations/layout separate from generated
structure where possible; never overwrite reviewed notes without an explicit merge strategy.

Recommendation: evaluate if A's SQLite synchronization becomes costly; do not adopt both this
and tbls by default. Source: [SchemaCrawler diagramming](https://www.schemacrawler.com/diagramming.html).

### D. DBeaver desktop diagrams

Inspect a disposable SQLite schema in a desktop database GUI; arrange diagrams, inspect metadata
and export a review snapshot. Diagrams are read-only by default; editing is separate.

Benefits: useful developer exploration alongside SQL/schema inspection; no cloud publication
needed for the workflow. Costs: desktop-driven review is less convenient for unattended evidence;
local layouts/exports do not replace Git schema history. Current docs label SVG export PRO;
other exports are available. Verify edition and exact SQLite feature behavior in the trial.

Recommendation: optional developer inspection tool, not the required documentation pipeline.
Source: [DBeaver diagrams](https://dbeaver.com/docs/dbeaver/ER-Diagrams/).

### E. draw.io conceptual diagrams

Manually arrange a conceptual model and annotations. SQL import creates table shapes, with
relationships connected by the author according to the documented workflow.

Benefits: precise visual storytelling and layout control. Costs: manual synchronization can
produce attractive but stale diagrams; visual source diffs are less useful than schema diffs.
Do not assume full SQLite dialect import from generic SQL import. Diagram versioning alone
cannot prove agreement with migrations.

Recommendation: only for a conceptual explanation that the main ERD tool cannot express well.
Source: [draw.io SQL import](https://www.drawio.com/docs/manual/insert/insert-sql/).

### F. Custom local TypeScript schema viewer

A future Node task could extract SQLite metadata into a reviewed report and render interactive
HTML. This is an architectural option, not an existing tool or an authorized implementation.

Benefits: tailored appearance, local workflow, reuse in future developer tools and CI artifacts.
Costs: we would own metadata fidelity, graph layout, accessibility, export, tests and maintenance.
Do not create a universal schema intermediate format or custom SQL parser incidentally.
Recommendation: defer unless a bounded tool trial proves existing tools cannot meet our needs.

## Original evaluation proposal (selection now resolved)

1. Resolved: owner chose DBML/dbdiagram for the review experience.
   Keep hosting/account choices separate from schema approval. No tool installation follows
   merely from this document; current project authorization remains documentation only.
2. The proposed comparison is no longer a prerequisite. If later needed to choose SQLite
   synchronization/check tooling, compare at most two candidates on a synthetic, non-product schema:
   A plus B initially; replace B with C if database-to-DBML is the priority. Do not design the
   actual Linefield tables as an incidental tool fixture.
3. Include one-to-many and optional relationships, composite PK/FK, uniqueness, CHECK constraints,
   defaults, partial/expression indexes and representative SQLite table options. Record omitted
   metadata explicitly. Do not simplify the real schema to fit a diagram tool.
4. Show the owner the same overview and focused view in both candidates, plus one before/after
   change. Assess readability, searchable field meanings, stable layout, local use, Git diff noise,
   constraints fidelity, reproducibility, setup/hosting cost and ease of regeneration.
5. Select one review path and at most one generation/check path. Pin versions and preserve source,
   layout, dictionary, review snapshot, proposal revision and explicit owner approval together.
6. After approval, Rust implements migrations. Rebuild a clean disposable SQLite database and
   compare actual metadata against the approved schema. Add upgrade/failure fixtures separately;
   a diagram or metadata diff does not test data migration, durability or application behavior.
7. Provide future Node .ts actions for generation/checks and Zed tasks that invoke those actions.
   Reuse outputs in CI later without requiring CI or a Zed extension now. Do not auto-publish.

## Acceptance for the chosen workflow

The owner can inspect entities and relationships without reading SQL. Review artifacts identify
source revision and tool version. Missing SQLite metadata and non-enforced conceptual relations
are explicitly labeled. One structural change produces an understandable before/after review;
regeneration preserves intentional notes or surfaces a conflict. Actual-schema differences are
reported rather than silently normalized. No real documents/credentials are used as tool fixtures.

Lead owns evaluation and final recommendation; database_designer owns schema meaning and visual
handoff; rust_engine owns SQL/domain parity; build_reliability owns future reproducible checks;
reviewer audits completeness. Product UX/UI designers are consulted only when presentation needs
justify it. Existing owner gates, implementation scope and concurrency limits still apply.
