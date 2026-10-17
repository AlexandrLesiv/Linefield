import { stripTypeScriptTypes } from "node:module";
import { readFile, readdir } from "node:fs/promises";

// A deliberately small data grammar: no evaluation, calls, spreads or computed keys.
export function validateCatalogSource(source: string): void {
  const code = stripTypeScriptTypes(source, { mode: "strip" });
  const tokens = (
    code.match(
      /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\/[^\n]*|\/\*[\s\S]*?\*\/|[A-Za-z_$][\w$]*|\d+(?:\.\d+)?|[^\s]/g,
    ) ?? []
  ).filter((token) => !token.startsWith("//") && !token.startsWith("/*"));
  let index = 0;
  const take = () => tokens[index++];
  const expect = (value: string) => {
    if (take() !== value) throw Error("Catalog must contain only exported constant data");
  };
  const quoted = (value: string | undefined) => value?.startsWith('"') || value?.startsWith("'");
  function data(): void {
    const token = take();
    if (token === "{" || token === "[") {
      const end = token === "{" ? "}" : "]";
      while (tokens[index] !== end) {
        if (token === "{") {
          const key = take();
          if (!quoted(key) && !/^[A-Za-z_$][\w$]*$/.test(key ?? ""))
            throw Error("Catalog keys must be literal");
          expect(":");
        }
        data();
        if (tokens[index] !== ",") break;
        take();
      }
      expect(end);
    } else if (!quoted(token) && !/^(?:\d+(?:\.\d+)?|true|false|null)$/.test(token ?? "")) {
      throw Error("Catalog values must be literal data");
    }
  }
  while (index < tokens.length) {
    expect("export");
    expect("const");
    if (!/^[A-Za-z_$][\w$]*$/.test(take() ?? "")) throw Error("Invalid data export");
    expect("=");
    data();
    expect(";");
  }
}

export async function validateCatalogSources(): Promise<void> {
  for (const directory of ["theme", "localization"]) {
    const base = new URL(`../shared/${directory}/`, import.meta.url);
    for (const name of await readdir(base)) {
      // resolve.ts is reviewed implementation, not an authored data catalog.
      if (name.endsWith(".ts") && !(directory === "theme" && name === "resolve.ts"))
        validateCatalogSource(await readFile(new URL(name, base), "utf8"));
    }
  }
}
