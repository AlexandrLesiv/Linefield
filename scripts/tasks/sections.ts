import type { Task } from "./model.ts";
import { escape as e, list, sourceLink, title } from "./presentation.ts";

export function scope(task: Task): string {
  return `<section class="panel" id="scope"><h2>Scope & authority</h2>
<p>${e(task.outcome)}</p><h3>Outside this task</h3>${list(task.nonGoals)}
<h3>Implementation ${e(title(task.authority.implementation))}</h3><p>${e(task.authority.basis)}</p>
<p class="meta">${e(title(task.security.classification))} · ${e(task.security.summary)}</p>
<h3>Dependencies</h3>${task.dependencies
    .map(
      (item) => `<div class="item"><strong>${e(item.taskId)}</strong>
<span class="tag">${e(item.kind)}</span><p>${e(item.reason)}</p>
${item.revision ? `<code>${e(item.revision)}</code>` : '<span class="meta">No frozen revision recorded</span>'}</div>`,
    )
    .join("")}
<details><summary>Ownership and scoped paths</summary><p>${e(task.ownership.role)}</p>
<p class="digest">Base ${e(task.ownership.baseRevision)}</p>${list(task.ownership.paths)}</details></section>`;
}
export function pullRequest(task: Task): string {
  const pr = task.pr;
  if (!pr)
    return `<section class="panel" id="pr"><h2>Branch & pull request</h2>
<p>No PR is linked. ${task.kind === "milestone" ? "This milestone is implemented through separately scoped child tasks." : "A PR has not been recorded."}</p></section>`;
  return `<section class="panel" id="pr"><div class="row"><h2>Pull request #${pr.number}</h2>
<a href="${e(pr.url)}" rel="noreferrer">Open on GitHub ↗</a></div>
<p><span class="tag">Observed ${e(pr.observedState)}</span> <span class="meta">${e(pr.observedAt)}</span></p>
<p class="meta">Snapshot only · no live GitHub synchronization</p>
<p>Branch <code>${e(task.ownership.branch ?? "unassigned")}</code><br>Base branch <code>${e(pr.baseBranch)}</code></p>
<details><summary>Recorded revisions</summary><p class="digest">Head: ${e(pr.headRevision ?? "unknown")}<br>
Merge: ${e(pr.mergeRevision ?? "not recorded")}</p></details></section>`;
}
export function acceptance(task: Task): string {
  return `<section class="panel" id="acceptance"><h2>Acceptance & tests</h2>
<p class="meta">Traceable links, not an automatically inferred acceptance verdict. Historical test outcomes are in Evidence.</p>
${task.acceptance
  .map(
    (criterion) => `<article class="item"><div class="row"><strong>${e(criterion.id)}</strong>
<span class="tag">${criterion.required ? "Required" : "Optional"}</span></div><p>${e(criterion.statement)}</p>
<p class="meta">Scenarios: ${e(criterion.scenarioIds.join(", ") || "Review-based criterion")}</p>
<details><summary>${criterion.testIds.length} linked checks · ${criterion.evidenceIds.length} evidence records</summary>
${criterion.testIds
  .map((id) => {
    const test = task.tests.find((entry) => entry.id === id);
    if (!test) throw new Error("Missing test after validation");
    return `<div class="item"><strong>${e(test.id)}</strong> <span class="tag">${e(test.status)} · ${e(test.kind)}</span>
<p>${e(test.description)}</p>${test.path ? `<a href="${e(sourceLink(test.path))}" rel="noreferrer">Test source · current task branch ↗</a> <code>${e(test.selector ?? "")}</code>` : '<span class="meta">No executable test source recorded</span>'}</div>`;
  })
  .join("")}
${criterion.evidenceIds.map((id) => `<p><a href="#evidence-${e(id)}">Evidence: ${e(id)}</a></p>`).join("")}
</details></article>`,
  )
  .join("")}</section>`;
}
