import { textOverview } from "./overview";
import { textRecord } from "./records";
import { checkedTextCore } from "../text-boundary";
import type { Core } from "../core";
import type { Camera } from "../camera";
import type { ImageCache } from "../images/cache";
import { TextCache, type TextJob } from "./cache";
import { textRecords, textContent, type TextRecord } from "./records";
import { textTiles, tileCorners } from "./tiles";
import { textNotice } from "./notice";
import { textAdmission, TEXT_JOB_LIMIT, TEXT_CONTENT_LIMIT } from "./admission";
export function textScene(
  core: Core,
  camera: Camera,
  gl: WebGL2RenderingContext,
  host: {
    images(): ImageCache;
    wait(signal: AbortSignal): Promise<void>;
    active(): boolean;
    changed(): void;
    note(kind: string): void;
  },
) {
  const text = checkedTextCore(core);
  let cache = new TextCache(gl, host),
    signature = "",
    records: TextRecord[] = [];
  let sourceEpoch = 0,
    planningError = "";
  const contents = new Map<
    number,
    { generation: number; epoch: number; style: string; text: string }
  >();
  const planned = new Map<number, { record: TextRecord; overview: TextJob; exact: TextJob[] }>();
  const notice = textNotice(() => {
    cache.retry();
    host.changed();
  }, host.note);
  function update(width: number, height: number, dpr: number) {
    const next = `${core.layer_render_revision()}:${core.transform_revision()}:${camera.originRevision}`;
    if (next !== signature) {
      records = textRecords(core, text, camera);
      signature = next;
    }
    planningError = "";
    const jobs: TextJob[] = [];
    planned.clear();
    let bytes = 0;
    const retained = new Set<number>();
    for (const record of records) {
      try {
        let tiles: ReturnType<typeof textTiles> = [],
          limited = false;
        try {
          tiles = textTiles(record, camera, width, height, dpr);
        } catch {
          planningError = "text-view-limit";
          limited = true;
        }
        if (!tiles.length && !limited) continue;
        if (bytes + record.length > TEXT_CONTENT_LIMIT || jobs.length >= TEXT_JOB_LIMIT) {
          planningError = "text-view-limit";
          continue;
        }
        let content = contents.get(record.id);
        const style = `${record.color}:${record.width}:${record.height}:${record.inkX}:${record.baseline}`;
        if (!content || content.generation !== record.generation) {
          const value = textContent(text, record);
          content = {
            generation: record.generation,
            epoch:
              content?.text === value && content.style === style ? content.epoch : ++sourceEpoch,
            style,
            text: value,
          };
          contents.set(record.id, content);
        }
        const rendered = { ...record, generation: content.epoch };
        retained.add(record.id);
        bytes += record.length;
        if (jobs.length + tiles.length + 1 > TEXT_JOB_LIMIT) {
          planningError = "text-view-limit";
          tiles = [];
        }
        const overview = textOverview(rendered, content.text);
        const exact = tiles.map((tile) => ({
          record: rendered,
          text: content.text,
          tile: { ...tile, key: tile.key.replace(/^\d+:/, `${rendered.generation}:`) },
        }));
        planned.set(record.id, { record: rendered, overview, exact });
        jobs.push(overview, ...exact);
      } catch {
        planningError = "text-render-failed";
      }
    }
    for (const id of contents.keys()) if (!retained.has(id)) contents.delete(id);
    cache.ensure(jobs);
    const pending = [...planned.values()].some(
      (p) => !p.exact.every((job) => cache.available(job.tile.key)),
    );
    notice.update(pending, cache.error || planningError);
    return [...planned.values()].map((p) => ({
      id: p.record.id,
      digest: "",
      opacity: p.record.opacity,
      corners: [],
      text: p.record,
    }));
  }
  function draw(
    record: TextRecord,
    width: number,
    height: number,
    cssWidth: number,
    cssHeight: number,
  ) {
    const plan = planned.get(record.id);
    if (!plan) return;
    let jobs =
      plan.exact.length && plan.exact.every((job) => cache.available(job.tile.key))
        ? plan.exact
        : cache.available(plan.overview.tile.key)
          ? [plan.overview]
          : [];
    for (const job of jobs) {
      const world = tileCorners(record, job.tile),
        corners: number[] = [];
      const c = Math.cos(camera.rotation),
        s = Math.sin(camera.rotation);
      for (let i = 0; i < world.length; i += 2)
        corners.push(
          ((camera.cx + camera.zoom * (c * world[i] - s * world[i + 1])) * width) / cssWidth,
          ((camera.cy + camera.zoom * (s * world[i] + c * world[i + 1])) * height) / cssHeight,
        );
      cache.draw(job, corners, record.opacity, width, height);
    }
  }
  return {
    update,
    draw,
    state: () => ({
      ...cache.state(),
      error: planningError || cache.error,
      retainedBytes: text.text_retained_bytes(),
    }),
    async prepare(record: TextRecord, content: string, signal: AbortSignal) {
      const overview = textOverview(record, content),
        bytes = textAdmission(core, text, camera, record);
      cache.admit(bytes.candidateBytes, bytes.totalBytes);
      const preparing = cache;
      const prepared = await preparing.prepare(record, content, overview.tile, signal);
      try {
        if (preparing !== cache) throw Error("text-gpu-lost");
        const afterBytes = textAdmission(core, text, camera, record),
          tile = overview.tile;
        const overviewBytes =
          (Math.ceil(tile.width * tile.density) + 4) *
          (Math.ceil(tile.height * tile.density) + 4) *
          4;
        cache.admit(Math.max(0, afterBytes.candidateBytes - overviewBytes), afterBytes.totalBytes);
      } catch (error) {
        prepared.dispose();
        throw error;
      }
      return {
        dispose: prepared.dispose,
        publish(id: number) {
          const actual = textRecord(text, camera, id, core.layer_render_revision());
          if (!actual) throw Error("text-boundary");
          const epoch = ++sourceEpoch,
            style = `${actual.color}:${actual.width}:${actual.height}:${actual.inkX}:${actual.baseline}`;
          contents.set(id, { generation: actual.generation, epoch, style, text: content });
          prepared.publish(textOverview({ ...actual, generation: epoch }, content));
          signature = "";
        },
      };
    },
    reset() {
      host.note("text-render-reset");
      cache.dispose(true);
      cache = new TextCache(gl, host);
      signature = "";
      contents.clear();
    },
    ready: () =>
      !planningError &&
      !cache.error &&
      [...planned.values()].every((p) => p.exact.every((job) => cache.available(job.tile.key))),
  };
}
