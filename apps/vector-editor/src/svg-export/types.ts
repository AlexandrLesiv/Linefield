import type { SvgExportCore } from "../svg-export-core";
export type { SvgExportCore };
export type ExportOptions = {
  density: 1 | 2 | 4;
  background: "current" | "white" | "transparent";
  grid: boolean;
};
export type ExportProgress = {
  phase: "preparing" | "rendering" | "encoding" | "paused" | "complete";
  packets: number;
  images: number;
  bytes: number;
};
export type ControllerOptions = {
  isInputActive: () => boolean;
  onProgress: (progress: ExportProgress) => void;
  wasmUrl?: string;
  resolveAsset?: (digest: string) => Promise<Blob>;
  onDiagnostic?: (event: ExportDiagnostic) => void;
};
export type ExportDiagnostic = {
  kind: "start" | "paused" | "resumed" | "complete" | "cancel" | "failure";
  job: number;
  elapsedMs: number;
  packets: number;
  images: number;
  bytes: number;
  code?: "cancelled" | "resource-limit" | "context-lost" | "worker" | "snapshot-changed" | "failed";
};
export type ExportView = {
  x: number;
  y: number;
  width: number;
  height: number;
  density: number;
  pixelWidth: number;
  pixelHeight: number;
  paper: number;
  grid: number;
  regionX: string;
  regionY: string;
};
export type WorkerCommand =
  | { kind: "init"; view: ExportView; wasmUrl: string }
  | { kind: "background" }
  | { kind: "packet"; values: Float64Array; last: boolean }
  | { kind: "image"; values: Float64Array; blob: Blob }
  | { kind: "png" }
  | { kind: "pull" }
  | { kind: "finish" };
export type WorkerRequest = { id: number; command: WorkerCommand } | { active: boolean };
export type WorkerReply = {
  id: number;
  error?: string;
  bytes?: ArrayBuffer;
  done?: boolean;
  pngBytes?: number;
};
export const PNG_CHUNK = 49152;
export const OUTPUT_LIMIT = 128 * 1024 * 1024;
/** Admission estimate; driver/encoder overhead is not observable as exact memory. */
export const SCRATCH_LIMIT = 256 * 1024 * 1024;
