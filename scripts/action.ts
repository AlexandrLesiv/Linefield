import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { commandFor, parseAction } from "./actions/catalog.ts";
import { fingerprint, freshness, sourcePaths } from "./actions/fingerprint.ts";
import { execute } from "./actions/process.ts";
import type { Execution } from "./actions/process.ts";
import { revision } from "./actions/revision.ts";
import { completeReport, success, writeReport } from "./actions/report.ts";
import type { Report } from "./actions/report.ts";
const id = parseAction(process.argv.slice(2));
if (!id) {
  process.stderr.write("Expected exactly one supported action ID.\n");
  process.exitCode = 2;
} else {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const controller = new AbortController();
  const cancel = () => controller.abort();
  process.on("SIGINT", cancel);
  process.on("SIGTERM", cancel);
  const start = performance.now();
  const startedAt = new Date().toISOString();
  let execution: Execution = {
    outcome: "spawn-failed",
    exitCode: null,
    signal: null,
    stdoutBytes: 0,
    stderrBytes: 0,
  };
  let toolVersion: string | null = null;
  const before = await fingerprint(root, sourcePaths, controller.signal);
  try {
    const command = await commandFor(root, id);
    toolVersion = command.version;
    execution = await execute({ ...command, cwd: root, signal: controller.signal });
  } catch {
    /* Fixed unavailable outcome; never expose tool paths or environment. */
  }
  const after = await fingerprint(root, sourcePaths, controller.signal);
  const draft: Omit<Report, "revision" | "cancelled" | "finishedAt" | "durationMs"> = {
    schemaVersion: 1,
    jobId: randomUUID(),
    actionId: id,
    startedAt,
    execution,
    nodeVersion: process.version,
    toolVersion,
    platform: process.platform,
    architecture: process.arch,
    dirty: "unavailable",
    before,
    after,
    freshness: freshness(before, after),
  };
  const report = await completeReport(
    draft,
    controller.signal,
    () => revision(root),
    () => ({
      finishedAt: new Date().toISOString(),
      durationMs: Math.round(performance.now() - start),
    }),
  );
  process.removeListener("SIGINT", cancel);
  process.removeListener("SIGTERM", cancel);
  const written = await writeReport(process.stdout, report);
  process.exitCode = written && success(report) ? 0 : 1;
}
