import { test } from "node:test";
import assert from "node:assert/strict";
import { getEventListeners } from "node:events";
import { execute } from "./process.ts";

const run = (code: string, outputLimit: number, signal = new AbortController().signal) =>
  execute({
    executable: process.execPath,
    arguments: ["-e", code],
    cwd: process.cwd(),
    signal,
    outputLimit,
  });

test("DX-ACTION-005 combined byte ceiling accepts equality and rejects one byte over", async () => {
  const code = "process.stdout.write('abcd'); process.stderr.write('efgh')";
  for (const limit of [8, 7]) {
    const result = await run(code, limit);
    assert.equal(result.stdoutBytes, 4);
    assert.equal(result.stderrBytes, 4);
    assert.equal(result.outcome, limit === 8 ? "passed" : "output-limit");
  }
});

test("DX-ACTION-005 non-ASCII output counts UTF-8 bytes on both streams", async () => {
  const code = "process.stdout.write('ї'); process.stderr.write('🎨')";
  for (const limit of [6, 5]) {
    const result = await run(code, limit);
    assert.equal(result.stdoutBytes, 2);
    assert.equal(result.stderrBytes, 4);
    assert.equal(result.outcome, limit === 6 ? "passed" : "output-limit");
    assert.ok(!JSON.stringify(result).includes("🎨"));
    assert.ok(!JSON.stringify(result).includes("ї"));
  }
});

test("DX-ACTION-003 external termination is failure rather than requested cancellation", async () => {
  const result = await run("process.kill(process.pid, 'SIGTERM')", 8);
  assert.equal(result.outcome, "failed");
  assert.equal(result.exitCode, null);
  assert.equal(result.signal, "SIGTERM");
});

test("DX-ACTION-004 success, failure, output limit and spawn failure remove their listener", async () => {
  const controller = new AbortController();
  const retained = () => {};
  controller.signal.addEventListener("abort", retained);
  const cases: ReadonlyArray<readonly [string, string]> = [
    ["", "passed"],
    ["process.exitCode = 7", "failed"],
    ["process.stdout.write('over')", "output-limit"],
  ];
  for (const [code, outcome] of cases) {
    assert.equal((await run(code, 1, controller.signal)).outcome, outcome);
    assert.deepEqual(getEventListeners(controller.signal, "abort"), [retained]);
  }
  const missing = await execute({
    executable: "/nonexistent-linefield-output-fixture",
    arguments: [],
    cwd: process.cwd(),
    signal: controller.signal,
  });
  assert.equal(missing.outcome, "spawn-failed");
  assert.deepEqual(getEventListeners(controller.signal, "abort"), [retained]);
  controller.signal.removeEventListener("abort", retained);
});
