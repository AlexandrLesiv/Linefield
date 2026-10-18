import assert from "node:assert/strict";
import { mkdtemp, mkdir, copyFile, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { renderDiagram } from "./render.ts";
import { loadTokens } from "./tokens.ts";
import { generateDiagrams } from "./generate.ts";
const tokens = loadTokens(
  JSON.parse(
    await readFile(new URL("../../shared/diagrams/style.tokens.json", import.meta.url), "utf8"),
  ),
);
const base = {
  width: 1440,
  height: 1080,
  title: 'A < B & "C"',
  description: "Static SVG",
  elements: [],
};
test("GEN03 escapes data and rejects active content and invalid XML text", () => {
  const svg = renderDiagram(
    {
      ...base,
      elements: [
        {
          tag: "text",
          attrs: { x: 72, y: 80, class: "body" },
          text: '<script>alert("x")</script>',
        },
      ],
    },
    tokens,
  );
  assert.ok(svg.includes("A &lt; B &amp; &quot;C&quot;"));
  assert.ok(!svg.includes("<script>"));
  assert.ok(svg.includes("&lt;script&gt;"));
  for (const element of [
    { tag: "script", attrs: {} },
    { tag: "foreignObject", attrs: {} },
    { tag: "rect", attrs: { onload: "alert(1)" } },
    { tag: "rect", attrs: { fill: "url(https://example.test/a)" } },
    { tag: "text", attrs: { style: "fill:red" }, text: "Hello" },
    { tag: "text", attrs: {}, text: "bad\u0000text" },
  ])
    assert.throws(() => renderDiagram({ ...base, elements: [element] }, tokens));
});
test("GEN04 shared style emits approved typography and palette", () => {
  const svg = renderDiagram(base, tokens);
  for (const expected of [
    "font-size:40px",
    "font-size:26px",
    "font-size:20px",
    "font-size:16px",
    "font-size:14px",
    "fill:#233148",
    "stroke:#718096",
  ])
    assert.ok(svg.includes(expected), expected);
  assert.throws(
    () =>
      renderDiagram(
        { ...base, elements: [{ tag: "rect", attrs: { fill: "{diagram.missing}" } }] },
        tokens,
      ),
    /Missing token/,
  );
});
test("GEN01 all committed diagrams match deterministic generation", async () => {
  assert.equal(await generateDiagrams(true), 19);
  assert.equal(renderDiagram(base, tokens), renderDiagram(base, tokens));
});
test("GEN01 check mode detects drift without overwriting output", async () => {
  const root = await mkdtemp(join(tmpdir(), "linefield-diagrams-"));
  try {
    await mkdir(join(root, "shared/diagrams/definitions"), { recursive: true });
    await mkdir(join(root, "docs/diagrams/v2"), { recursive: true });
    await copyFile(
      new URL("../../shared/diagrams/style.tokens.json", import.meta.url),
      join(root, "shared/diagrams/style.tokens.json"),
    );
    await writeFile(join(root, "shared/diagrams/definitions/example.json"), JSON.stringify(base));
    const url = pathToFileURL(root + "/");
    assert.equal(await generateDiagrams(false, url), 1);
    await writeFile(join(root, "docs/diagrams/v2/example.svg"), "changed");
    await assert.rejects(generateDiagrams(true, url), /drift/);
    assert.equal(await readFile(join(root, "docs/diagrams/v2/example.svg"), "utf8"), "changed");
    await writeFile(join(root, "docs/diagrams/v2/orphan.svg"), "stale output");
    await assert.rejects(generateDiagrams(false, url), /without a shared definition/);
    assert.equal(await readFile(join(root, "docs/diagrams/v2/orphan.svg"), "utf8"), "stale output");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
