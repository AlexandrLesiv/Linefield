import { catalog as sourceCatalog } from "../../shared/localization/catalog.ts";
import { en } from "../../shared/localization/en.ts";
import { uk } from "../../shared/localization/uk.ts";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse } from "./schema.ts";
import { generate } from "./generate.ts";
const actual = parse(sourceCatalog, { en, uk });
const synthetic = parse(
  {
    version: 1,
    sourceLanguage: "en",
    messages: {
      "test.count": {
        kind: "plural",
        context: "Synthetic plural compiler fixture",
        selector: "count",
        arguments: { count: "integer" },
      },
      "test.literal": {
        kind: "plain",
        context: "Synthetic escaping fixture",
        arguments: { name: "string" },
      },
    },
  },
  {
    en: {
      "test.count": { one: "{count} item", other: "{count} items" },
      "test.literal": `100% ' " <&> \\\n{name}`,
    },
    uk: {
      "test.count": {
        one: "{count} предмет",
        few: "{count} предмети",
        many: "{count} предметів",
        other: "{count} предмета",
      },
      "test.literal": `100% ' " <&> \\\n{name}`,
    },
  },
);
const directory = await mkdtemp(join(tmpdir(), "linefield-native-locales-"));
try {
  for (const [tool, extension] of [
    ["xmllint", /\.(xml|resw)$/],
    ["msgfmt", /\.po$/],
  ] as const) {
    const probe = spawnSync(tool, ["--version"], { encoding: "utf8" });
    if (probe.error && "code" in probe.error && probe.error.code === "ENOENT") {
      console.log(JSON.stringify({ check: tool, status: "not-run", reason: "tool unavailable" }));
      continue;
    }
    let files = 0;
    for (const fixture of [actual, synthetic]) {
      for (const [path, content] of Object.entries(
        generate(fixture.catalog, fixture.translations),
      )) {
        if (!extension.test(path)) continue;
        const location = join(directory, `resource-${files++}`);
        await writeFile(location, content);
        const args =
          tool === "xmllint"
            ? ["--noout", location]
            : ["--check", "--check-format", "-o", join(directory, "messages.mo"), location];
        const result = spawnSync(tool, args, { encoding: "utf8", timeout: 30_000 });
        if (result.error || result.status !== 0)
          throw Error(`${tool}: ${path}: ${result.error?.message ?? result.stderr}`);
      }
    }
    console.log(
      JSON.stringify({
        check: tool,
        status: "passed",
        files,
        scope: "resource syntax; not native app runtime",
      }),
    );
  }
} finally {
  await rm(directory, { recursive: true, force: true });
}
