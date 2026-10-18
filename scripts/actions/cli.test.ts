import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, cp, access, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execute, childEnvironment } from "./process.ts";
const root = fileURLToPath(new URL("../../", import.meta.url));
const launch = promisify(execFile);
function jobId(text: string): string {
  const value: unknown = JSON.parse(text);
  assert.ok(
    typeof value === "object" &&
      value !== null &&
      "jobId" in value &&
      typeof value.jobId === "string",
  );
  return value.jobId;
}
test("DX-ACTION-007 two actual CLI checks have distinct report identities", async () => {
  const options = {
    cwd: root,
    env: childEnvironment(process.env),
    timeout: 15000,
    maxBuffer: 16384,
  };
  const first = await launch(process.execPath, ["scripts/action.ts", "locales-check"], options);
  const second = await launch(process.execPath, ["scripts/action.ts", "locales-check"], options);
  assert.notEqual(jobId(first.stdout), jobId(second.stdout));
  assert.equal(first.stderr, "");
  assert.ok(!first.stdout.includes(root));
});
test("DX-ACTION-001 actual CLI rejects unknown text without echoing it", async () => {
  const result = await execute({
    executable: process.execPath,
    arguments: ["scripts/action.ts", "secret;echo injected"],
    cwd: root,
    signal: new AbortController().signal,
  });
  assert.equal(result.outcome, "failed");
  assert.equal(result.exitCode, 2);
  assert.equal(result.stdoutBytes, 0);
});
test("DX-ACTION-009 actual resource checks fail missing outputs without regenerating", async () => {
  const fixture = await mkdtemp(join(tmpdir(), "linefield-check-only-"));
  try {
    await cp(join(root, "scripts"), join(fixture, "scripts"), { recursive: true });
    await cp(join(root, "shared"), join(fixture, "shared"), {
      recursive: true,
      filter: (source) => !source.includes("/generated"),
    });
    for (const [script, catalog] of [
      ["localization", "localization"],
      ["theme-resources", "theme"],
    ]) {
      await assert.rejects(
        launch(process.execPath, [join(fixture, "scripts", `${script}.ts`), "--check"], {
          cwd: fixture,
          env: childEnvironment(process.env),
          timeout: 15000,
          maxBuffer: 16384,
        }),
        (error: unknown) => {
          assert.ok(error instanceof Error && "stderr" in error);
          assert.equal(typeof error.stderr, "string");
          assert.match(String(error.stderr), /Stale generated resource:/);
          return true;
        },
      );
      await assert.rejects(access(join(fixture, "shared", catalog ?? "", "generated")));
    }
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});
