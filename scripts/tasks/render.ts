import { createHash } from "node:crypto";
import type { Document, Evidence, Task } from "./model.ts";
import { readTaskFile } from "./files.ts";
import { acceptance, pullRequest, scope } from "./sections.ts";
import { attention, escape as e, list, prose, shell, sourceLink, title } from "./presentation.ts";

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
<summary>${e(item.title)} <span class="tag">${e(item.kind)}</span></summary>
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
  const sections = ["Scope", "PR", "Acceptance", "Evidence", "Documents", "Review", "Handoff"];
  return shell(
    task.title,
    style,
    `<header><div class="mast"><strong>LINEFIELD / TASKS</strong>
<a href="index.html">All pilot tasks</a></div><p class="eyebrow">${e(task.id)} · ${e(task.kind)}</p>
<h1>${e(task.title)}</h1><p class="lead">${e(task.summary)}</p></header>
<aside class="attention ${task.stage === "blocked" ? "blocked" : ""}" aria-label="Review attention">
<h2>${e(attention(task))}</h2><p>${e(task.handoff)}</p></aside>
<div class="facts"><div class="fact"><span class="label">Workflow</span><strong>${e(title(task.stage))}</strong></div>
<div class="fact"><span class="label">Acceptance</span><strong>${task.acceptance.length} criteria linked</strong></div>
<div class="fact"><span class="label">Evidence</span><strong>${task.evidence.length} preserved records</strong></div></div>
<div class="layout"><nav class="section-nav" aria-label="Task sections">${sections.map((name) => `<a href="#${name.toLowerCase()}">${name}</a>`).join("")}</nav>
<main id="main">${scope(task)}${pullRequest(task)}${acceptance(task)}
<section class="panel" id="evidence"><h2>Verification evidence</h2><p class="warning">Recorded results retain their original scope. Artifact integrity does not establish current acceptance.</p>${await evidence(root, task)}</section>
<section class="panel" id="documents"><h2>Design & supporting documents</h2>${await documents(root, task, false)}</section>
<section class="panel" id="review"><h2>Independent review</h2>${await documents(root, task, true)}</section>
<section class="panel" id="handoff"><h2>Next handoff</h2><p>${e(task.handoff)}</p></section>
</main></div>`,
  );
}
export function renderIndex(tasks: readonly Task[], style: string): string {
  return shell(
    "Task review",
    style,
    `<header><div class="mast"><strong>LINEFIELD / TASKS</strong><span class="meta">Documentation pilot · v1</span></div>
<p class="eyebrow">A single place to review the work</p><h1>From intent to evidence.</h1>
<p class="lead">Scope, design, verification and pull requests — connected in one readable task record.</p></header>
<main id="main"><div class="cards">${tasks
      .map(
        (
          task,
        ) => `<article class="panel card"><span class="label">${e(task.id)} · ${e(task.kind)}</span>
<h2>${e(task.title)}</h2><p>${e(task.summary)}</p><span class="tag">${e(title(task.stage))}</span>
<p class="meta">${task.acceptance.length} acceptance criteria · ${task.evidence.length} evidence records</p>
<a class="open" href="${e(task.id)}.html">Review task →</a></article>`,
      )
      .join("")}</div>
<p class="meta">Pilot packages preserve existing task documents and evidence. PR state is a dated observation; the preview never runs checks or changes approval.</p></main>`,
  );
}
