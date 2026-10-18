import type { Task } from "./model.ts";

export function markdownText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\\", "\\\\")
    .replace(/[`*_{}[\]()#+.!|]/g, "\\$&");
}
export function agentBrief(task: Task): string {
  const m = markdownText;
  return `<!-- Generated from task.json. Do not edit. -->
# ${m(task.id)} — ${m(task.title)}

${m(task.summary)}

Stage: ${m(task.stage)}. Implementation: ${m(task.authority.implementation)}.
Branch: ${m(task.ownership.branch ?? "milestone; child tasks own branches")}.
Base: ${m(task.ownership.baseRevision)}.
PR: ${task.pr ? `${task.pr.url} (${m(task.pr.observedState)}, observed ${m(task.pr.observedAt)})` : "not linked"}.

## Scope

${m(task.outcome)}

Non-goals: ${task.nonGoals.map(m).join("; ")}.
Authority: ${m(task.authority.basis)}
Security: ${m(task.security.classification)} — ${m(task.security.summary)}

## Dependencies

${task.dependencies.map((item) => `- ${m(item.taskId)} [${m(item.kind)}]: ${m(item.reason)}`).join("\n")}

## Acceptance and test links

${task.acceptance.map((item) => `- ${m(item.id)}: ${m(item.statement)}\n  Tests: ${item.testIds.map(m).join(", ") || "none recorded"}. Evidence: ${item.evidenceIds.map(m).join(", ") || "none recorded"}.`).join("\n")}

## Read only as needed

${task.documents.map((item) => `- ${m(item.title)}: ${m(item.path)}`).join("\n")}

Detailed test selectors, source links and artifact hashes are in task.json. Recorded historical
results are not current-code verification. No tool command or approval is implied by task data.

## Handoff

${m(task.handoff)}
`;
}
