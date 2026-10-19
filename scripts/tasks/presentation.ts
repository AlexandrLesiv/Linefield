import type { Task } from "./model.ts";

export function escape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
export function title(value: string): string {
  return value.replaceAll("-", " ");
}
export function sourceLink(path: string, revision: string | null = null): string {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `https://github.com/AlexandrLesiv/Linefield/blob/${revision ?? "codex/dx-t02-task-packages"}/${encoded}`;
}
export function list(values: readonly string[]): string {
  return `<ul>${values.map((value) => `<li>${escape(value)}</li>`).join("")}</ul>`;
}
export function attention(task: Task): string {
  if (task.stage === "blocked") return "Blocked";
  if (task.stage === "owner-review") return "Review";
  return title(task.stage);
}
export function shell(name: string, style: string, content: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<title>${escape(name)} · Linefield tasks</title><style>${style}</style></head>
<body><a class="skip" href="#main">Skip to task content</a><div class="page">${content}
</div></body></html>\n`;
}
export function prose(source: string): string {
  // Conservative text rendering: raw HTML, links and embedded media never execute.
  return source
    .split(/\n\s*\n/)
    .map((block) => {
      if (/^#{1,6} /.test(block)) {
        return `<h3>${escape(block.replace(/^#{1,6} /, ""))}</h3>`;
      }
      return `<p>${escape(block).replaceAll("\n", "<br>")}</p>`;
    })
    .join("");
}
