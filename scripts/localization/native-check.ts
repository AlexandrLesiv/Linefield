import { catalog as sourceCatalog } from "../../shared/localization/catalog.ts";
import { en } from "../../shared/localization/en.ts";
import { uk } from "../../shared/localization/uk.ts";
import { invokeTool, ToolFailure } from "../resource-tool.ts";
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
    const label = tool === "xmllint" ? "xml" : "gettext";
    if (invokeTool(tool, ["--version"], label, "probe") === undefined) {
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
        invokeTool(tool, args, label, "compile");
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
} catch (error: unknown) {
  console.error(
    JSON.stringify({
      check: "localization-native",
      status: "failed",
      reason: "resource validation failed",
      ...(error instanceof ToolFailure ? error.diagnostic : {}),
    }),
  );
  process.exitCode = 1;
} finally {
  await rm(directory, { recursive: true, force: true });
}
