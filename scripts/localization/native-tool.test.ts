import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { access, mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, delimiter } from "node:path";
import { fileURLToPath } from "node:url";
import { invokeTool, ToolFailure } from "../resource-tool.ts";

for (const stage of ["probe", "compile"] as const) {
  test(`LOC-NATIVE-01 ${stage} failures reject without exposing tool output`, async () => {
    const directory = await mkdtemp(join(tmpdir(), "linefield-native-tool-"));
    const sentinel = "private-resource-name-and-content";
    const exitCode = stage === "probe" ? 7 : 9;
    const marker = join(directory, "compile-marker");
    try {
      const fixture = [
        "#!/usr/bin/env node",
        "const { writeFileSync } = require('node:fs');",
        `const probe = process.argv.includes('--version');`,
        `if (!probe) writeFileSync(${JSON.stringify(marker)}, 'attempted');`,
        `if (${stage === "probe" ? "probe" : "!probe"}) {`,
        `  process.stderr.write(${JSON.stringify(sentinel)});`,
        `  process.exitCode = ${exitCode};`,
        "} else if (probe) process.stdout.write('fixture');",
        "else throw Error('compile-must-not-follow-failed-probe');",
        "",
      ].join("\n");
      await writeFile(join(directory, "xmllint"), fixture, { mode: 0o755 });
      const result = spawnSync(
        process.execPath,
        [fileURLToPath(new URL("./native-check.ts", import.meta.url))],
        {
          env: { ...process.env, PATH: [directory, dirname(process.execPath)].join(delimiter) },
          encoding: "utf8",
          shell: false,
          timeout: 30_000,
          maxBuffer: 128 * 1024,
        },
      );
      assert.ifError(result.error);
      assert.equal(result.status, 1);
      assert.equal(result.stdout, "");
      assert.deepEqual(JSON.parse(result.stderr), {
        check: "localization-native",
        status: "failed",
        reason: "nonzero-exit",
        tool: "xml",
        stage,
        exit: exitCode,
        signal: null,
      });
      assert.ok(!result.stderr.includes(sentinel));
      assert.ok(!result.stderr.includes(directory));
      if (stage === "probe") await assert.rejects(access(marker));
      else await access(marker);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
}

test("LOC-NATIVE-02 excessive tool output fails with content-free diagnostics", () => {
  assert.throws(
    () =>
      invokeTool(
        process.execPath,
        ["-e", "process.stderr.write('private'.repeat(100000))"],
        "gettext",
        "probe",
      ),
    (error: unknown) => {
      assert.ok(error instanceof ToolFailure);
      assert.equal(error.diagnostic.reason, "execution-error");
      assert.equal(error.diagnostic.tool, "gettext");
      assert.equal(error.diagnostic.stage, "probe");
      assert.ok(!JSON.stringify(error).includes("private"));
      return true;
    },
  );
});
