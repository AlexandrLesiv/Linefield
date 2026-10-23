import { captureLimits } from "./capture.ts";
import type { CaptureReport } from "./capture.ts";
export type ExportState = "idle" | "preparing" | "ready" | "requested" | "failed";
/** A yielded encoder. It retains at most one bounded Blob, with no raw app state. */
export class DiagnosticExport {
  state: ExportState = "idle";
  #blob: Blob | undefined;
  #report: CaptureReport | undefined;
  #generation = 0;
  #url: string | undefined;
  #revokeTimer: ReturnType<typeof setTimeout> | undefined;
  #encodingCodeUnits = 0;
  get allocatedBlobBytes(): number {
    return this.#blob?.size ?? 0;
  }
  /** Retained encoded string characters; not a JS heap/residency measurement. */
  get encodingCodeUnits(): number {
    return this.#encodingCodeUnits;
  }
  async prepare(report: CaptureReport): Promise<boolean> {
    if (this.state === "preparing") return false;
    if (this.#report === report && this.#blob) return true;
    this.clear();
    const generation = this.#generation;
    this.state = "preparing";
    try {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      if (generation !== this.#generation) return false;
      const { records, ...metadata } = report;
      const parts: BlobPart[] = [JSON.stringify(metadata).slice(0, -1), ',"events":['];
      let bytes = String(parts[0]).length + 11;
      this.#encodingCodeUnits = bytes;
      for (let offset = 0; offset < records.length; offset += 64) {
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        if (generation !== this.#generation) return false;
        const chunk = records
          .slice(offset, offset + 64)
          .map((record) => JSON.stringify(record.value))
          .join(",");
        const prefix = offset ? "," : "";
        bytes += prefix.length + chunk.length;
        this.#encodingCodeUnits = bytes;
        if (bytes + 2 > captureLimits.bytes) throw Error("diagnostics-export-limit");
        parts.push(prefix, chunk);
      }
      parts.push("]}");
      this.#blob = new Blob(parts, { type: "application/json" });
      this.#report = report;
      this.state = "ready";
      this.#encodingCodeUnits = 0;
      return true;
    } catch {
      if (generation === this.#generation) {
        this.state = "failed";
        this.#encodingCodeUnits = 0;
      }
      return false;
    }
  }
  /** Call only from a fresh explicit idle action after serialization has finished. */
  download(idle: boolean): boolean {
    if (!idle || !this.#blob || this.state === "preparing") return false;
    try {
      this.#revoke();
      this.#url = URL.createObjectURL(this.#blob);
      const link = document.createElement("a");
      link.href = this.#url;
      link.download = "linefield-diagnostics.json";
      link.click();
      this.state = "requested";
      this.#revokeTimer = setTimeout(() => this.#revoke(), 30_000);
      return true;
    } catch {
      this.state = "failed";
      this.#revoke();
      return false;
    }
  }
  clear(): void {
    this.#generation++;
    this.#encodingCodeUnits = 0;
    this.#blob = undefined;
    this.#report = undefined;
    this.state = "idle";
    this.#revoke();
  }
  #revoke(): void {
    clearTimeout(this.#revokeTimer);
    if (this.#url) URL.revokeObjectURL(this.#url);
    this.#url = undefined;
    this.#revokeTimer = undefined;
  }
}
