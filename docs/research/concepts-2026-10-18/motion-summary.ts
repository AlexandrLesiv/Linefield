import { readFile, writeFile } from "node:fs/promises";

type Frame = {
  index: number;
  pts: number;
  fromStart: { changedFraction: number };
  fromEnd: { changedFraction: number };
};
type Analysis = {
  sourceSha256: string;
  pts: number[];
  trials: { action: { operation: string; trial: number }; anchor: number; frames: Frame[] }[];
};
const root = new URL("./assets/", import.meta.url);
for (const name of ["motion", "motion-property"]) {
  const settleThreshold = name === "motion-property" ? 0.0005 : 0.0001;
  const analysis = JSON.parse(
    await readFile(new URL(`${name}-frame-analysis.json`, root), "utf8"),
  ) as Analysis;
  const trials = analysis.trials.map((trial, ordinal) => {
    const first = trial.frames.find((frame) => frame.fromStart.changedFraction > 0.0005);
    const settled = trial.frames.find(
      (frame, index) =>
        frame.pts >= trial.anchor &&
        frame.fromEnd.changedFraction <= settleThreshold &&
        trial.frames
          .slice(index)
          .every((later) => later.fromEnd.changedFraction <= settleThreshold),
    );
    if (!first || !settled) throw new Error(`Missing endpoint ${ordinal}`);
    const beforeFirst = analysis.pts[first.index - 1] ?? first.pts;
    const beforeSettled = analysis.pts[settled.index - 1] ?? settled.pts;
    const gaps = analysis.pts
      .slice(first.index, settled.index + 1)
      .map((time, index) => time - (analysis.pts[first.index + index - 1] ?? time));
    return {
      ordinal: ordinal + 1,
      ...trial.action,
      firstFrame: first.index,
      firstPts: first.pts,
      previousPts: beforeFirst,
      settledFrame: settled.index,
      settledPts: settled.pts,
      previousSettledPts: beforeSettled,
      observedMs: (settled.pts - first.pts) * 1000,
      durationBracketMs: [
        Math.max(0, beforeSettled - first.pts) * 1000,
        Math.max(0, settled.pts - beforeFirst) * 1000,
      ],
      maximumSampleGapMs: Math.max(...gaps) * 1000,
    };
  });
  const groups = [...new Set(trials.map((trial) => trial.operation))].map((operation) => {
    const values = trials
      .filter((trial) => trial.operation === operation)
      .map((trial) => trial.observedMs)
      .sort((a, b) => a - b);
    return {
      operation,
      count: values.length,
      medianMs: values[Math.floor(values.length / 2)],
      rangeMs: [values[0], values.at(-1)],
    };
  });
  const gaps = analysis.pts.slice(1).map((time, index) => time - (analysis.pts[index] ?? time));
  const ordered = gaps.toSorted((a, b) => a - b);
  const summary = {
    sourceSha256: analysis.sourceSha256,
    criterion: `Start: >0.05% pixels differ >8/255 from baseline; settle: <=${settleThreshold * 100}% differ >8/255 from final reference and remain so through window end. Analysis image320x320, not human perceptual ground truth.`,
    cadence: {
      frames: analysis.pts.length,
      minGapMs: ordered[0]! * 1000,
      medianGapMs: ordered[Math.floor(ordered.length / 2)]! * 1000,
      p95GapMs: ordered[Math.floor(ordered.length * 0.95)]! * 1000,
      maxGapMs: ordered.at(-1)! * 1000,
      gapsOver25ms: gaps.filter((gap) => gap > 0.025).length,
    },
    groups,
    trials,
  };
  await writeFile(new URL(`${name}-timing-summary.json`, root), JSON.stringify(summary, null, 2));
  const table = [
    "| Event | Operation / trial | First changed PTS | Settled PTS | Observed ms | Sampling bracket ms | Largest gap ms |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: |",
    ...trials.map(
      (trial) =>
        `| ${name === "motion" ? "M1" : "M2"}-${String(trial.ordinal).padStart(2, "0")} | ${trial.operation === "width-retarget" ? "width-open (retarget sequence)" : trial.operation} / ${trial.trial} | ${trial.firstPts.toFixed(6)} | ${trial.settledPts.toFixed(6)} | ${trial.observedMs.toFixed(1)} | ${trial.durationBracketMs.map((x) => x.toFixed(1)).join("–")} | ${trial.maximumSampleGapMs.toFixed(1)} |`,
    ),
  ];
  await writeFile(new URL(`${name}-timing-table.md`, root), table.join("\n") + "\n");
  console.log(name, JSON.stringify(summary.cadence), JSON.stringify(groups));
}
