import { test } from "node:test";
import assert from "node:assert/strict";
import { Writable } from "node:stream";
import { completeReport, success, writeReport } from "./report.ts";
import type { Report } from "./report.ts";
const fixture: Report = {
  schemaVersion: 1,
  jobId: "test-fixture",
  actionId: "lint",
  startedAt: "2026-10-18T00:00:00Z",
  finishedAt: "2026-10-18T00:00:01Z",
  durationMs: 1000,
  execution: { outcome: "passed", exitCode: 0, signal: null, stdoutBytes: 10, stderrBytes: 0 },
  nodeVersion: "v24.12.0",
  toolVersion: "1.88.0",
  platform: "darwin",
  architecture: "arm64",
  revision: null,
  dirty: "unavailable",
  before: { sha256: "test", files: 1, bytes: 2 },
  after: { sha256: "test", files: 1, bytes: 2 },
  freshness: "fresh",
  cancelled: false,
};
test("DX-ACTION-004 cancellation during final metadata cannot become success", async () => {
  const controller = new AbortController();
  const report = await completeReport(
    fixture,
    controller.signal,
    async () => {
      await Promise.resolve();
      controller.abort();
      return null;
    },
    () => ({ finishedAt: fixture.finishedAt, durationMs: fixture.durationMs }),
  );
  assert.equal(report.execution.outcome, "passed");
  assert.equal(report.cancelled, true);
  assert.equal(success(report), false);
});
test("DX-ACTION-010 final timing includes pending revision collection and cancellation", async () => {
  for (const cancel of [false, true]) {
    const controller = new AbortController();
    let release: (value: string | null) => void = () => {
      throw Error("metadata-promise-not-initialized");
    };
    const metadata = new Promise<string | null>((resolve) => {
      release = resolve;
    });
    let samples = 0;
    let elapsed = 1000;
    const pending = completeReport(
      fixture,
      controller.signal,
      () => metadata,
      () => {
        samples++;
        return { finishedAt: new Date(elapsed).toISOString(), durationMs: elapsed };
      },
    );
    assert.equal(samples, 0);
    elapsed = 2500;
    if (cancel) controller.abort();
    release("a".repeat(40));
    const report = await pending;
    assert.equal(samples, 1);
    assert.equal(report.durationMs, 2500);
    assert.equal(report.finishedAt, new Date(2500).toISOString());
    assert.equal(report.revision, "a".repeat(40));
    assert.equal(report.cancelled, cancel);
    assert.equal(success(report), !cancel);
  }
});
test("DX-ACTION-006 passing execution with stale or unavailable endpoint evidence is not accepted", () => {
  assert.equal(success(fixture), true);
  assert.equal(success({ ...fixture, freshness: "stale" }), false);
  assert.equal(success({ ...fixture, freshness: "unavailable" }), false);
});
test("DX-ACTION-008 report writes one bounded JSON document", async () => {
  let output = "";
  const sink = new Writable({
    write(chunk: Buffer, _encoding, done) {
      output += chunk.toString();
      done();
    },
  });
  assert.equal(await writeReport(sink, fixture), true);
  assert.deepEqual(JSON.parse(output), fixture);
  assert.equal(output.split("\n").length, 2);
});
test("DX-ACTION-008 sink failure is visible without leaking error details", async () => {
  const sink = new Writable({
    write(_chunk, _encoding, done) {
      done(Error("private-path-secret"));
    },
  });
  assert.equal(await writeReport(sink, fixture), false);
});
