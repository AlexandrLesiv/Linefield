import { createHash } from "node:crypto";
import type { Task } from "./model.ts";

export function taskFixture(): Task {
  return {
    schemaVersion: 1,
    id: "DX-T02",
    title: "Task packages",
    kind: "leaf",
    stage: "owner-review",
    summary: "One task view",
    outcome: "Linked evidence",
    nonGoals: ["No task execution"],
    ownership: {
      branch: "codex/dx-t02",
      baseRevision: "a".repeat(40),
      paths: ["tasks"],
      role: "lead",
    },
    integration: null,
    pr: null,
    dependencies: [],
    authority: { implementation: "authorized", basis: "Owner request", refs: ["brief"] },
    security: { classification: "no-boundary-change", summary: "Read-only local documentation" },
    documents: [
      {
        id: "brief",
        title: "Brief",
        kind: "brief",
        path: "brief.md",
        sha256: fixtureHash("brief"),
        artifactRevision: null,
      },
    ],
    acceptance: [
      {
        id: "TASK-01",
        statement: "Validate",
        required: true,
        scenarioIds: [],
        testIds: ["check"],
        evidenceIds: ["run"],
      },
    ],
    tests: [
      {
        id: "check",
        kind: "static",
        status: "implemented",
        path: "check.ts",
        selector: "check",
        description: "Validate task",
      },
    ],
    evidence: [
      {
        id: "run",
        title: "Historical run",
        path: "run.json",
        sha256: fixtureHash("run"),
        artifactRevision: "b".repeat(40),
        kind: "report",
        outcome: "passed",
        runId: "run-1",
        sourceRevision: "a".repeat(40),
        sourceManifest: null,
        recordedAt: "2026-10-19T12:00:00Z",
        limitations: ["Historical evidence, not current verification"],
      },
    ],
    handoff: "Owner review pending",
  };
}
export function fixtureHash(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}
