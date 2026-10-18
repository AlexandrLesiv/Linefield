import { readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { renderDiagram } from "./render.ts";
import { loadTokens } from "./tokens.ts";
export async function generateDiagrams(
  check: boolean,
  root = new URL("../../", import.meta.url),
): Promise<number> {
  const directory = new URL("shared/diagrams/definitions/", root);
  const tokens = loadTokens(
    JSON.parse(await readFile(new URL("shared/diagrams/style.tokens.json", root), "utf8")),
  );
  const names = (await readdir(directory)).filter((name) => name.endsWith(".json")).sort();
  const expected = new Set(names.map((name) => name.replace(/\.json$/, ".svg")));
  const existing = await readdir(new URL("docs/diagrams/v2/", root));
  if (existing.some((name) => name.endsWith(".svg") && !expected.has(name)))
    throw new Error("Unexpected generated SVG without a shared definition");
  const outputs = await Promise.all(
    names.map(async (name) => ({
      path: new URL(`docs/diagrams/v2/${name.replace(/\.json$/, ".svg")}`, root),
      content: renderDiagram(JSON.parse(await readFile(new URL(name, directory), "utf8")), tokens),
    })),
  );
  for (const { path, content } of outputs) {
    if (check) {
      if ((await readFile(path, "utf8")) !== content)
        throw new Error(`Generated diagram drift: ${fileURLToPath(path)}`);
    } else await writeFile(path, content);
  }
  return outputs.length;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.slice(2).some((arg) => arg !== "--check"))
    throw new Error("Usage: generate.ts [--check]");
  console.log(
    `${await generateDiagrams(process.argv.includes("--check"))} diagrams ${process.argv.includes("--check") ? "verified" : "generated"}`,
  );
}
