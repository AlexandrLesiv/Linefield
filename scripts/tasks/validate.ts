import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import type { Task } from "./model.ts";
import { readTaskFile, safePath } from "./files.ts";
import { validateAgainstSchema } from "./schema-validation.ts";

const schema: unknown = JSON.parse(
  readFileSync(new URL("../../shared/tasks/task.schema.json", import.meta.url), "utf8"),
);
function validDate(value: string): boolean {
  const timestamp = Date.parse(value);
  return (
    Number.isFinite(timestamp) &&
    new Date(timestamp).toISOString().slice(0, 19) === value.slice(0, 19)
  );
}
function unique(values: readonly string[], label: string): Set<string> {
  const result = new Set(values);
  if (result.size !== values.length) throw new Error(`Duplicate ${label}`);
  return result;
}
function references(values: readonly string[], known: ReadonlySet<string>, label: string): void {
  unique(values, label);
  for (const value of values) if (!known.has(value)) throw new Error(`Dangling ${label}: ${value}`);
}
export function validateTask(value: unknown): Task {
  validateAgainstSchema(value, schema);
  const task = value as Task;
  const documentIds = unique(
    task.documents.map((item) => item.id),
    "document ID",
  );
  const evidenceIds = unique(
    task.evidence.map((item) => item.id),
    "evidence ID",
  );
  const testIds = unique(
    task.tests.map((item) => item.id),
    "test ID",
  );
  unique(
    task.acceptance.map((item) => item.id),
    "acceptance ID",
  );
  unique(
    task.dependencies.map((item) => item.taskId),
    "dependency ID",
  );
  if (task.dependencies.some((item) => item.taskId === task.id)) throw new Error("Self dependency");
  references(task.authority.refs, documentIds, "authority reference");
  if (task.kind === "leaf" && task.ownership.branch === null)
    throw new Error("Leaf requires branch");
  for (const path of task.ownership.paths) safePath(path);
  for (const acceptance of task.acceptance) {
    unique(acceptance.scenarioIds, "scenario ID");
    references(acceptance.testIds, testIds, "test reference");
    references(acceptance.evidenceIds, evidenceIds, "evidence reference");
  }
  for (const test of task.tests) {
    if (test.path !== null) safePath(test.path);
    if (test.status === "implemented" && (test.path === null || test.selector === null))
      throw new Error(`Implemented test needs path and selector: ${test.id}`);
  }
  const paths = new Map<string, string>();
  for (const item of [...task.documents, ...task.evidence]) {
    safePath(item.path);
    if (paths.has(item.path) && paths.get(item.path) !== item.sha256)
      throw new Error("Conflicting file hashes");
    paths.set(item.path, item.sha256);
  }
  for (const item of task.evidence) {
    if (item.sourceManifest !== null) {
      safePath(item.sourceManifest);
      if (!paths.has(item.sourceManifest))
        throw new Error("Source manifest needs hashed reference");
    }
    if (item.recordedAt !== null && !validDate(item.recordedAt))
      throw new Error("Invalid evidence date");
  }
  if (task.pr !== null) {
    const pr = task.pr;
    if (pr.url !== `https://github.com/${pr.repository}/pull/${pr.number}`)
      throw new Error("PR identity mismatch");
    if (!validDate(pr.observedAt)) throw new Error("Invalid PR date");
    if ((pr.observedState === "merged") !== (pr.mergeRevision !== null))
      throw new Error("PR merge identity mismatch");
  }
  if (task.integration !== null)
    references([task.integration.evidenceId], evidenceIds, "integration evidence");
  if (task.stage === "done") {
    if (task.kind === "milestone")
      throw new Error("Completed milestone aggregation is not supported in v1");
    const integration = task.integration;
    const proof = task.evidence.find((item) => item.id === integration?.evidenceId);
    if (
      task.pr?.observedState !== "merged" ||
      integration?.revision !== task.pr.mergeRevision ||
      proof?.outcome !== "passed" ||
      proof.sourceRevision !== integration?.revision
    )
      throw new Error("Done requires merged PR and matching integration evidence");
  }
  return task;
}
export async function loadTask(root: string, path: string): Promise<Task> {
  const content = await readTaskFile(root, path, 524_288);
  const task = validateTask(JSON.parse(content.toString("utf8")));
  const hashes = new Map(
    [...task.documents, ...task.evidence].map((item) => [item.path, item.sha256]),
  );
  let total = content.length;
  for (const [location, expected] of hashes) {
    const bytes = await readTaskFile(root, location, Math.min(8_388_608, 33_554_432 - total));
    total += bytes.length;
    if (createHash("sha256").update(bytes).digest("hex") !== expected)
      throw new Error(`Hash mismatch: ${location}`);
  }
  for (const test of task.tests)
    if (test.path !== null && !hashes.has(test.path)) {
      const bytes = await readTaskFile(root, test.path, Math.min(8_388_608, 33_554_432 - total));
      total += bytes.length;
    }
  return task;
}
