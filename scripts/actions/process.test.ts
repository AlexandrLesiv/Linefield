import { test } from "node:test";
import assert from "node:assert/strict";
import { execute, childEnvironment } from "./process.ts";
const run = (code: string, options: Partial<Parameters<typeof execute>[0]> = {}) =>
  execute({
    executable: process.execPath,
    arguments: ["-e", code],
    cwd: process.cwd(),
    signal: new AbortController().signal,
    ...options,
  });
test("DX-ACTION-002/003 direct argv execution preserves exit result", async () => {
  const passed = await run("process.exitCode = 0");
  assert.equal(passed.outcome, "passed");
  const failed = await run("process.exitCode = 7");
  assert.equal(failed.outcome, "failed");
  assert.equal(failed.exitCode, 7);
  const missing = await run("", { executable: "/nonexistent-linefield-action" });
  assert.equal(missing.outcome, "spawn-failed");
});
test("DX-ACTION-004 timeout forces a direct child that ignores termination", async () => {
  const result = await run("process.on('SIGTERM', () => {}); setInterval(() => {}, 20)", {
    timeoutMs: 300,
    graceMs: 50,
  });
  assert.equal(result.outcome, "timed-out");
  assert.equal(result.signal, "SIGKILL");
});
test("DX-ACTION-004 first cancellation wins even after output and successful exit", async () => {
  const controller = new AbortController();
  const pending = run(
    "process.on('SIGTERM', () => { process.stdout.write('x'.repeat(10000)); process.exitCode = 0; clearInterval(timer); }); const timer = setInterval(() => {}, 20)",
    { signal: controller.signal, outputLimit: 10, graceMs: 500 },
  );
  const timer = setTimeout(() => controller.abort(), 300);
  const result = await pending;
  clearTimeout(timer);
  assert.equal(result.outcome, "cancelled");
});
test("DX-ACTION-004 already canceled request never spawns", async () => {
  const controller = new AbortController();
  controller.abort();
  const result = await run("process.exitCode = 99", { signal: controller.signal });
  assert.equal(result.outcome, "cancelled");
  assert.equal(result.exitCode, null);
});
test("DX-ACTION-005 output flood is bounded and reports contain no raw content", async () => {
  const result = await run(
    "process.stdout.write('secret-token-private-path'.repeat(100000)); setInterval(() => {}, 20)",
    { outputLimit: 4096 },
  );
  assert.equal(result.outcome, "output-limit");
  assert.ok(result.stdoutBytes > 4096);
  assert.ok(!JSON.stringify(result).includes("secret-token"));
});
test("DX-ACTION-005 credential and executable-injection environment is excluded", () => {
  assert.deepEqual(
    childEnvironment({
      PATH: "/trusted/bin",
      HOME: "/test-home",
      NODE_OPTIONS: "--import=evil",
      API_KEY: "secret",
      LD_PRELOAD: "evil",
    }),
    { NO_COLOR: "1", PATH: "/trusted/bin", HOME: "/test-home" },
  );
});
