import { spawn, execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { argv } from "node:process";

const root = new URL("./assets/", import.meta.url);
const properties = argv.includes("--properties");
const movie = properties
  ? "concepts-usb-property-changes-2026-10-18.mov"
  : "concepts-usb-motion-2026-10-18.mov";
const source = new URL(movie, root).pathname;
const ffmpeg = "/tmp/linefield-motion-tools/org/bytedeco/ffmpeg/macosx-arm64/ffmpeg";
const ffprobe = ffmpeg.replace(/ffmpeg$/, "ffprobe");
const metadata = JSON.parse(
  execFileSync(ffprobe, ["-v", "quiet", "-show_format", "-show_streams", "-of", "json", source], {
    encoding: "utf8",
  }),
) as unknown;
const ptsData = JSON.parse(
  execFileSync(
    ffprobe,
    [
      "-v",
      "quiet",
      "-select_streams",
      "v:0",
      "-show_frames",
      "-show_entries",
      "frame=best_effort_timestamp_time",
      "-of",
      "json",
      source,
    ],
    { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
  ),
) as {
  frames: { best_effort_timestamp_time: string }[];
};
const pts = ptsData.frames.map((frame) => Number(frame.best_effort_timestamp_time));
const anchors = properties
  ? [
      17.104133, 17.75435, 18.737967, 19.688183, 20.671733, 21.655283, 36.391833, 37.142, 38.108883,
      39.075767, 40.075983, 41.076067,
    ]
  : [
      32.022633, 32.690683, 33.707567, 34.707783, 35.708017, 36.708233, 51.159233, 51.82825,
      52.828483, 53.8287, 54.828917, 55.829133, 56.846033, 57.84625, 58.863133, 59.9134, 60.89695,
      61.897167, 76.050283, 76.750517, 77.734067, 78.717617, 79.701167, 80.66805, 81.668317,
      82.651867, 83.652083, 84.669, 85.669217, 86.652767, 99.847417, 113.9255, 114.759017, 115.6926,
      116.84285, 117.693033, 135.121967, 135.8305, 136.830733, 137.814217, 138.822767, 139.797983,
    ];
const actions = JSON.parse(
  await readFile(
    new URL(properties ? "usb-property-change-actions.json" : "usb-motion-actions.json", root),
    "utf8",
  ),
) as {
  operation: string;
  trial: number;
  hostBefore: number;
  hostAfter: number;
}[];
type Frame = { index: number; pts: number; pixels: Buffer };
const windows: Frame[][] = anchors.map(() => []);
const size = 320 * 320;
const process = spawn(ffmpeg, [
  "-v",
  "error",
  "-i",
  source,
  "-an",
  "-vf",
  "crop=1290:1290:0:320,scale=320:320,format=gray",
  "-fps_mode",
  "passthrough",
  "-f",
  "rawvideo",
  "pipe:1",
]);
let pending = Buffer.alloc(0);
let index = 0;
for await (const chunk of process.stdout) {
  pending = Buffer.concat([pending, chunk as Buffer]);
  while (pending.length >= size) {
    const time = pts[index];
    if (time === undefined) throw new Error("Decoded more frames than probed");
    anchors.forEach((anchor, position) => {
      const tail =
        !properties && position === 30 ? 1.2 : position === 32 ? 0.8 : position === 34 ? 0.75 : 0.6;
      if (time >= anchor - 0.2 && time <= anchor + tail) {
        windows[position]?.push({
          index,
          pts: time,
          pixels: Buffer.from(pending.subarray(0, size)),
        });
      }
    });
    pending = pending.subarray(size);
    index += 1;
  }
}
if (index !== pts.length || pending.length) throw new Error("Frame count mismatch");
function difference(a: Buffer, b: Buffer) {
  let total = 0;
  let changed = 0;
  for (let pixel = 0; pixel < size; pixel += 1) {
    const delta = Math.abs((a[pixel] ?? 0) - (b[pixel] ?? 0));
    total += delta;
    if (delta > 8) changed += 1;
  }
  return { mean: total / size, changedFraction: changed / size };
}
const trials = windows.map((frames, position) => {
  const first = frames[0];
  const last = frames.at(-1);
  if (!first || !last) throw new Error("Missing trial");
  return {
    action: actions[position],
    anchor: anchors[position],
    frames: frames.map((frame) => ({
      index: frame.index,
      pts: frame.pts,
      fromStart: difference(frame.pixels, first.pixels),
      fromEnd: difference(frame.pixels, last.pixels),
    })),
  };
});
const hash = createHash("sha256");
for await (const chunk of createReadStream(source)) hash.update(chunk);
await writeFile(
  new URL(properties ? "motion-property-frame-analysis.json" : "motion-frame-analysis.json", root),
  JSON.stringify(
    {
      sourceSha256: hash.digest("hex"),
      metadata,
      crop: "1290:1290:0:320",
      analysisSize: [320, 320],
      method:
        "Native frame PTS; grayscale absolute difference against before/after references; visual endpoint review required.",
      decodedFrames: index,
      pts,
      trials,
    },
    null,
    2,
  ),
);
console.log(`Analyzed ${index} frames across ${trials.length} action windows.`);
