import { readFile } from "node:fs/promises";
type Trial = {
  mode: string;
  count: number;
  elapsedMs: number;
  setupMs: number;
  workerStartMs: number;
  workerMs: number;
  validationMs: number;
  preparations: number[];
  trips: number[];
  frames: number[];
  canonicalBytes: number;
  maxExtraPayloadBytes: number;
};
const path = process.argv[2] || ".build-cache/save01/report.json";
const report = JSON.parse(await readFile(path, "utf8")) as {
  hardware: object;
  browser: string;
  environment: object;
  runs: { result: Trial[] }[];
  recovery: object;
  sourceHashes: object;
};
const percentile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  const value = (index: number) => {
    const result = sorted[index];
    if (result === undefined || !Number.isFinite(result))
      throw Error("Missing finite observations");
    return result;
  };
  if (p === 0.5)
    return Number(
      (
        (value(Math.floor((sorted.length - 1) / 2)) + value(Math.floor(sorted.length / 2))) /
        2
      ).toFixed(3),
    );
  return Number(value(Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)).toFixed(3));
};
const all = report.runs.flatMap((run) => run.result);
const rows = [];
for (const count of [1000, 100000, 1000000]) {
  for (const mode of ["transfer", "shared-staged", "shared-direct"]) {
    const trials = all.filter((t) => t.count === count && t.mode === mode);
    const first = trials[0];
    if (!first) throw Error("Missing workload");
    const prep = trials.flatMap((t) => t.preparations),
      trips = trials.flatMap((t) => t.trips);
    const frames = trials.flatMap((t) => t.frames);
    rows.push({
      count,
      mode,
      runs: trials.length,
      preparationTotalMedianMs: percentile(
        trials.map((t) => t.preparations.reduce((a, b) => a + b, 0)),
        0.5,
      ),
      preparationChunkP95Ms: percentile(prep, 0.95),
      preparationChunkMaxMs: percentile(prep, 1),
      roundtripP50Ms: percentile(trips, 0.5),
      roundtripP95Ms: percentile(trips, 0.95),
      roundtripP99Ms: percentile(trips, 0.99),
      frameP95Ms: percentile(frames, 0.95),
      frameMaxMs: percentile(frames, 1),
      elapsedMedianMs: percentile(
        trials.map((t) => t.elapsedMs),
        0.5,
      ),
      elapsedMaxMs: percentile(
        trials.map((t) => t.elapsedMs),
        1,
      ),
      workerMedianMs: percentile(
        trials.map((t) => t.workerMs),
        0.5,
      ),
      setupMedianMs: percentile(
        trials.map((t) => t.setupMs),
        0.5,
      ),
      workerStartMedianMs: percentile(
        trials.map((t) => t.workerStartMs),
        0.5,
      ),
      validationMedianMs: percentile(
        trials.map((t) => t.validationMs),
        0.5,
      ),
      canonicalBytes: first.canonicalBytes,
      maxExtraPayloadBytes: first.maxExtraPayloadBytes,
    });
  }
}
console.log(
  JSON.stringify(
    {
      hardware: report.hardware,
      browser: report.browser,
      environment: report.environment,
      rows,
      recovery: report.recovery,
    },
    null,
    2,
  ),
);
