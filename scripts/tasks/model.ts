export interface Document {
  id: string;
  title: string;
  kind: "brief" | "design" | "review" | "decision" | "contract" | "handoff";
  path: string;
  sha256: string;
  artifactRevision: string | null;
}
export interface Evidence {
  id: string;
  title: string;
  path: string;
  sha256: string;
  artifactRevision: string | null;
  kind: "report" | "log" | "review" | "manifest" | "image" | "fixture";
  outcome: "passed" | "failed" | "skipped" | "not-run" | "mixed" | "informational";
  runId: string;
  sourceRevision: string | null;
  sourceManifest: string | null;
  recordedAt: string | null;
  limitations: string[];
}
export interface Task {
  schemaVersion: 1;
  id: string;
  title: string;
  kind: "leaf" | "milestone";
  stage:
    | "planned"
    | "ready"
    | "in-progress"
    | "internal-review"
    | "owner-review"
    | "changes-requested"
    | "blocked"
    | "integration-pending"
    | "done"
    | "cancelled";
  summary: string;
  outcome: string;
  nonGoals: string[];
  ownership: { branch: string | null; baseRevision: string; paths: string[]; role: string };
  integration: { revision: string; evidenceId: string } | null;
  pr: {
    repository: string;
    number: number;
    url: string;
    observedState: "open" | "closed" | "merged" | "unknown";
    observedAt: string;
    headRevision: string | null;
    baseBranch: string;
    mergeRevision: string | null;
  } | null;
  dependencies: {
    kind: "hard" | "contract" | "independent";
    taskId: string;
    reason: string;
    revision: string | null;
  }[];
  authority: {
    implementation: "authorized" | "not-authorized" | "conditional";
    basis: string;
    refs: string[];
  };
  security: {
    classification:
      | "not-assessed"
      | "no-boundary-change"
      | "existing-sensitive-boundary"
      | "new-or-changed-boundary";
    summary: string;
  };
  documents: Document[];
  acceptance: {
    id: string;
    statement: string;
    required: boolean;
    scenarioIds: string[];
    testIds: string[];
    evidenceIds: string[];
  }[];
  tests: {
    id: string;
    kind: "unit" | "integration" | "browser" | "native" | "manual" | "static";
    status: "implemented" | "planned" | "manual";
    path: string | null;
    selector: string | null;
    description: string;
  }[];
  evidence: Evidence[];
  handoff: string;
}
