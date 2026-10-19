import { createHash } from "node:crypto";
import type { TaskEntry } from "./source-tasks.ts";
import type { Document, Evidence, Task } from "./model.ts";
import { readTaskFile } from "./files.ts";
import { acceptance, pullRequest, scope } from "./sections.ts";
import { attention, escape as e, list, prose, shell, sourceLink } from "./presentation.ts";

async function contents(root: string, item: Document | Evidence): Promise<string> {
  const bytes = await readTaskFile(root, item.path);
  if (createHash("sha256").update(bytes).digest("hex") !== item.sha256)
    throw new Error(`Source changed during rendering: ${item.path}`);
  if (item.kind === "fixture" || item.kind === "image")
    return "Binary artifact preserved at its source; not embedded in the task page.";
  const source = bytes.toString("utf8");
  return source.length > 24_000
    ? source.slice(0, 24_000) + "\n[Preview truncated; see original source.]"
    : source;
}
async function documents(root: string, task: Task, reviews: boolean): Promise<string> {
  const items = task.documents.filter((item) => reviews === (item.kind === "review"));
  const rendered = await Promise.all(
    items.map(
      async (item) => `<details id="document-${e(item.id)}">
<summary>${e(item.title)}</summary>
<div class="document">${prose(await contents(root, item))}<p class="digest">SHA-256 ${e(item.sha256)}</p>
<a href="${e(sourceLink(item.path, item.artifactRevision))}" rel="noreferrer">${item.artifactRevision ? "Preserved source at " + e(item.artifactRevision.slice(0, 8)) : "Authored source · mutable task branch"} ↗</a></div></details>`,
    ),
  );
  return (
    rendered.join("") ||
    '<p class="meta">No independent review is recorded for this milestone implementation.</p>'
  );
}
async function evidence(root: string, task: Task): Promise<string> {
  const items = await Promise.all(
    task.evidence.map(
      async (item) => `<article class="item" id="evidence-${e(item.id)}">
<div class="row"><strong>${e(item.title)}</strong><span class="tag">Recorded ${e(item.outcome)}</span></div>
<p class="meta">Preserved artifact · hash verified · current-code freshness not assessed</p>
<details><summary>Record details and source</summary><p class="meta">Run ${e(item.runId)} · ${e(item.recordedAt ?? "Date not normalized; inspect original record")}</p>
<p class="digest">Source revision: ${e(item.sourceRevision ?? "See original source snapshot")}<br>SHA-256 ${e(item.sha256)}</p>
${list(item.limitations)}<pre>${e(await contents(root, item))}</pre>
<a href="${e(sourceLink(item.path, item.artifactRevision))}" rel="noreferrer">${item.artifactRevision ? "Preserved evidence at " + e(item.artifactRevision.slice(0, 8)) : "Evidence copy · mutable task branch"} ↗</a></details></article>`,
    ),
  );
  return items.join("");
}
export async function renderTask(root: string, task: Task, style: string): Promise<string> {
  const disclosure = (id: string, label: string, body: string) =>
    `<details class="group" id="${id}"><summary>${label}</summary><div class="group-content">${body}</div></details>`;
  return shell(
    task.title,
    style,
    `<a class="back" href="index.html">← Tasks</a>
<main id="main"><header class="task-header"><h1>${e(task.title)}</h1>
<p class="status">${e(attention(task))}</p><p class="lead">${e(task.summary)}</p>
${task.stage === "blocked" ? `<p class="blocker">${e(task.handoff)}</p>` : ""}
${task.pr ? `<a class="primary" href="${e(task.pr.url)}" rel="noreferrer">Review PR #${task.pr.number} ↗</a>` : ""}</header>
<div class="groups">
${disclosure("scope-group", "Scope &amp; design", scope(task) + `<section id="documents"><h2>Supporting documents</h2>${await documents(root, task, false)}</section>`)}
${disclosure("verification-group", "Verification", acceptance(task) + `<section id="evidence"><h2>Recorded evidence</h2><p class="warning">Recorded results retain their original scope. Artifact integrity does not establish current acceptance.</p>${await evidence(root, task)}</section>`)}
${disclosure("review-group", "Review", `<section id="review">${await documents(root, task, true)}</section>`)}
${disclosure("technical-group", "Details &amp; history", pullRequest(task) + `<section id="handoff"><h2>Next handoff</h2><p>${e(task.handoff)}</p></section><p class="meta">${e(task.id)} · Read-only review snapshot. Artifact hashes verify preserved records; they do not certify current code or a future merge.</p>`)}
</div></main>`,
  );
}
export function renderIndex(tasks: readonly TaskEntry[], style: string): string {
  return shell(
    "Tasks",
    style,
    `<main id="main"><h1>Tasks</h1><p class="meta">Source tasks show their original documents; their workflow status has not been reconciled.</p><ul class="task-list">${tasks
      .map(
        (task) =>
          `<li><a href="${e(task.id)}.html"><span><span class="task-id">${e(task.id)}</span>${e(task.title)}</span><span class="status">${e(task.status)}</span></a></li>`,
      )
      .join("")}</ul></main>`,
  );
}
