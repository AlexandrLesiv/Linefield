import { preparation } from "./preparation-bridge.ts";
import { frames } from "./frame-bridge.ts";
import { PreparedOwnership } from "./prepared-ownership.ts";
import type { Entry, PreparedPage } from "./prepared-ownership.ts";
import { geometryMetrics as metrics } from "./geometry-metrics.ts";
export type { Entry, PreparedPage } from "./prepared-ownership.ts";
export class PreparedStore extends PreparedOwnership {
  borrow(page: PreparedPage) {
    return this.borrows.borrow(page);
  }
  protected retained(
    stroke: bigint,
    revision: bigint,
    detail: number,
    frame: bigint,
    chunk: bigint,
    exact = false,
  ) {
    const entries = this.entries.get(String(stroke) + ":" + String(chunk));
    let hit: Entry | undefined;
    for (const entry of entries ?? []) {
      if (entry.revision !== revision) {
        metrics.preparedStaleRetirements++;
        this.clear(entry);
        continue;
      }
      if (entry.detail < detail || (exact && entry.detail !== detail)) continue;
      const covered =
        !entry.token ||
        (frame
          ? frames.coverage(this.state(), entry.token, frame)
          : preparation.coverage(this.state(), entry.token));
      if (
        covered &&
        (!hit ||
          entry.detail < hit.detail ||
          (entry.detail === hit.detail && entry.used >= hit.used))
      )
        hit = entry;
      else if (!covered) metrics.preparedCoverageMisses++;
    }
    return hit;
  }
  protected *retainedPages(hit: Entry, detail: number): Generator<PreparedPage> {
    metrics.preparedRequests++;
    metrics.preparedHits++;
    if (hit.detail > detail) metrics.preparedFinerHits++;
    hit.used = this.residency.active?.sequence ?? 0;
    this.lru.delete(hit);
    this.lru.set(hit, true);
    const alternatives = this.entries.get(hit.key);
    if (alternatives) {
      alternatives.delete(hit);
      alternatives.add(hit);
    }
    hit.pins++;
    try {
      for (const page of hit.pages) {
        metrics.preparedHitPages++;
        metrics.preparedHitBytes += page.data.byteLength;
        yield page;
      }
    } finally {
      hit.pins--;
      if (hit.stale && !hit.pins) this.clear(hit);
    }
  }
}
