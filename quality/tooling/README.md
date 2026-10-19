# Repository tooling boundaries

The [developer action contract](../../docs/developer-actions.md) defines the bounded local CLI
in [scripts/action.ts](../../scripts/action.ts). Use its fixed action catalogue rather than
arbitrary shell input. Action reports identify jobs, runtime/tools and before/after source
fingerprints; endpoint fingerprints do not establish an atomic source snapshot.

Output limits count combined stdout/stderr bytes. Diagnostics must exclude captured private
content; cancellation and unsuccessful children remain failures/cancelled outcomes rather than
success. Report completion time is sampled after final revision metadata collection, retaining
the original job start; serialization and stdout delivery are outside that duration. These are
maintained behavior notes, not fresh execution results or a restored developer-tool test suite.

## Editor limitations

Project-local [Zed tasks](../../.zed/tasks.json) invoke fixed action IDs. `reveal:never` requests
focus preservation; `save:none` checks files already on disk. Editor focus, terminal reuse,
workspace paths, selected Node and cancellation propagation require actual editor verification.
CLI runs alone did not establish them. Concurrency exclusion is per task, not a cross-task native
lock. Editor shell mediation is separate from the action runner's shell-disabled child spawning.
Linux action behavior remains unverified; Windows support is not established by macOS checks.

## Diagram and schema generation

Agents read [diagram definitions/tokens](../../shared/diagrams/README.md) and
[schema sources](../../shared/schema/README.md), rather than generated SVG. Generate visuals
locally for semantic/layout review. Do not commit duplicate exports or treat generation success
as architectural approval, accessibility certification or visual readability proof.

The DTCG consumer implements a documented subset, not full format conformance. It has no native
consumer, widget system or application-theme conversion implied by documentation styles.
Schema views must preserve constraint meaning: a partial UNIQUE is not global uniqueness and
foreign-key targets need unconditional candidate keys. Reference SQL is authoritative for
constraints; proposal-only definitions are not installed migrations.

See [tooling guide](../../docs/tooling.md) for installed commands. Routine results belong
in ignored local/CI artifacts linked from task or PR records. Historical successful counts do
not certify the current sources. Product tests remain required; removed tool-only test suites
are not reintroduced here.
