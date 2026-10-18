import { access, readFile, writeFile } from "node:fs/promises";

const root = new URL("./", import.meta.url);
const pages = [
  { input: "report.md", output: "index.html", title: "Concepts — a study for Linefield" },
  { input: "observations.md", output: "observations.html", title: "Device observation ledger" },
  {
    input: "../concepts-official-sources-2026-10-18.md",
    output: "sources.html",
    title: "Official sources",
  },
  {
    input: "../../design/concepts-study-linefield-adaptation-2026-10-18.md",
    output: "adaptation.html",
    title: "Designer adaptation proposal",
  },
];
try {
  await access(new URL("motion-analysis.md", root));
  pages.push({ input: "motion-analysis.md", output: "motion.html", title: "Motion evidence" });
} catch (error) {
  if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
}
const targets = new Map(pages.map((page) => [new URL(page.input, root).href, page.output]));
const escape = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

function inline(value: string, source: URL): string {
  return escape(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_: string, label: string, href: string) => {
      const url = new URL(href.replaceAll("&amp;", "&"), source);
      const hash = url.hash;
      url.hash = "";
      const known = targets.get(url.href);
      const local = url.href.startsWith(root.href) ? url.href.slice(root.href.length) : "";
      const asset = /^assets\/.+\.(jpg|png|json|mp4)$/.test(local);
      const page = pages.some((item) => item.output === local);
      const target = url.protocol === "https:" ? url.href : (known ?? (asset || page ? local : ""));
      if (href.startsWith("#")) return `<a href="${escape(href)}">${label}</a>`;
      return target
        ? `<a href="${escape(target + hash)}">${label}</a>`
        : `${label} <small>(repository reference)</small>`;
    });
}

function markdown(source: string, location: URL): { body: string; navigation: string } {
  const output: string[] = [];
  const navigation: string[] = [];
  const ids = new Map<string, number>();
  let table = false;
  let list = "";
  let code = false;
  let paragraph: string[] = [];
  let section = "Research comparison";
  const format = (text: string) => inline(text, location);
  const flush = () => {
    if (paragraph.length) {
      const tag = list ? "li" : "p";
      output.push(`<${tag}>${format(paragraph.join(" "))}</${tag}>`);
      paragraph = [];
    }
  };
  const close = () => {
    flush();
    if (table) output.push("</tbody></table></div>");
    if (list) output.push(`</${list}>`);
    table = false;
    list = "";
  };
  for (const line of source.split("\n")) {
    if (/^(~~~|```)/.test(line)) {
      close();
      output.push(code ? "</code></pre>" : "<pre><code>");
      code = !code;
      continue;
    }
    if (code) {
      output.push(escape(line));
      continue;
    }
    if (!line.trim()) {
      close();
      continue;
    }
    if (line.startsWith("<")) {
      close();
      output.push(line);
      continue;
    }
    const heading = /^(#{1,6}) (.+)/.exec(line);
    if (heading?.[1] && heading[2]) {
      close();
      const level = heading[1].length;
      const label = heading[2];
      const slug = label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const count = (ids.get(slug) ?? 0) + 1;
      ids.set(slug, count);
      const id = count === 1 ? slug : `${slug}-${count}`;
      output.push(`<h${level} id="${id}">${format(label)}</h${level}>`);
      if (level === 2) {
        section = label;
        navigation.push(`<a href="#${id}">${escape(label)}</a>`);
      }
      continue;
    }
    if (line.startsWith("|")) {
      if (/^\|[\s:|-]+\|$/.test(line)) continue;
      const cells = line.slice(1, -1).split("|");
      if (!table) {
        close();
        output.push(
          `<div class="table-scroll" tabindex="0" role="region" aria-label="${escape(section)} table"><table><thead><tr>`,
        );
        output.push(cells.map((cell) => `<th scope="col">${format(cell.trim())}</th>`).join(""));
        output.push("</tr></thead><tbody>");
        table = true;
      } else {
        output.push(`<tr>${cells.map((cell) => `<td>${format(cell.trim())}</td>`).join("")}</tr>`);
      }
      continue;
    }
    const bullet = /^(- |\d+\. )(.+)/.exec(line);
    if (bullet?.[1] && bullet[2]) {
      flush();
      const kind = bullet[1] === "- " ? "ul" : "ol";
      if (list !== kind || table) {
        close();
        output.push(`<${kind}>`);
        list = kind;
      }
      paragraph.push(bullet[2]);
    } else {
      if (table || (list && !/^\s/.test(line))) close();
      paragraph.push(line.trim());
    }
  }
  close();
  return { body: output.join("\n"), navigation: navigation.join("\n") };
}

for (const page of pages) {
  const location = new URL(page.input, root);
  const { body, navigation } = markdown(await readFile(location, "utf8"), location);
  const related = pages
    .map(
      (item) =>
        `<a href="${item.output}"${item === page ? ' aria-current="page"' : ""}>${escape(item.title)}</a>`,
    )
    .join("");
  const html = `<!doctype html>
<!-- Generated from trusted local research Markdown by build.ts. -->
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light"><title>${escape(page.title)}</title>
<link rel="stylesheet" href="report.css"><link rel="stylesheet" href="report-media.css"><script src="report.js" defer></script></head>
<body><a class="skip" href="#main">Skip to report</a>
<header><a class="brand" href="index.html">Linefield <span>/ Research</span></a><span>18 October 2026 · Private local study</span></header>
<div class="layout"><aside><details open><summary>On this page</summary><nav aria-label="Report sections">${navigation}</nav></details><nav class="related" aria-label="Evidence documents">${related}</nav></aside>
<main id="main" tabindex="-1">${body}<footer>Research and design proposal. No Linefield product code changed. Screenshots © their respective owners; retained locally for this review.</footer></main></div></body></html>`;
  await writeFile(new URL(page.output, root), html);
}
console.log(`Built ${pages.length} local research pages.`);
