import type { CanvasKit, Path, PathBuilder } from "canvaskit-wasm";
import { appendPathPage } from "../../../../src/memory/path-page.ts";
import { key } from "./protocol.ts";
import type { Frame, Cursor, Stroke } from "./protocol.ts";
import type { Measure } from "./measure.ts";
import { turn } from "../cpu-raster/reference.ts";
type Entry = Cursor & { builder?: PathBuilder; path?: Path; color: number[] };
export class Cache {
  private scope = "";
  private entries = new Map<string, Entry>();
  hits = 0;
  builds = 0;
  appendedVerbs = 0;
  readonly kit: CanvasKit;
  constructor(kit: CanvasKit) {
    this.kit = kit;
  }
  clear() {
    for (const entry of this.entries.values()) {
      entry.path?.delete();
      entry.builder?.delete();
    }
    this.entries.clear();
  }
  cursors(): Cursor[] {
    return Array.from(this.entries.values(), ({ key: identity, verbs, terminal, culled }) => ({
      key: identity,
      verbs,
      terminal,
      culled,
    }));
  }
  handles() {
    const values = Array.from(this.entries.values());
    return {
      paths: values.filter((v) => v.path).length,
      builders: values.filter((v) => v.builder).length,
      snapshots: 0,
    };
  }
  async prepare(frame: Frame, measure: Measure) {
    const scope = [frame.module, frame.state.owner, frame.state.session, frame.state.mapping].join(
      ":",
    );
    if (scope !== this.scope) {
      this.clear();
      this.scope = scope;
    }
    this.hits = 0;
    this.builds = 0;
    this.appendedVerbs = 0;
    for (const stroke of frame.strokes) await this.update(frame, stroke, measure);
    const current = new Set(frame.strokes.map((s) => s.key));
    const absent = Array.from(this.entries.keys()).filter((id) => !current.has(id));
    // Only one hidden terminal Undo/Redo operand is retained in this finite experiment.
    for (const id of absent) {
      const entry = this.entries.get(id)!;
      if (!entry.terminal || absent.indexOf(id) < absent.length - 1) {
        entry.path?.delete();
        entry.builder?.delete();
        this.entries.delete(id);
      }
    }
    if (this.entries.size > 1026 || this.handles().paths > 1025 || this.handles().builders > 1)
      throw Error("cache-inventory");
  }
  private async update(frame: Frame, stroke: Stroke, measure: Measure) {
    if (
      stroke.key !== key(frame.module, frame.state, stroke.id, stroke.geometry) ||
      stroke.geometry !== frame.state.mapping
    )
      throw Error("stroke-identity");
    let entry = this.entries.get(stroke.key);
    if (stroke.from === 0n) {
      this.entries.delete(stroke.key);
      entry?.path?.delete();
      entry?.builder?.delete();
      entry = {
        key: stroke.key,
        verbs: 0n,
        terminal: false,
        culled: false,
        builder: measure.run(
          "builder-allocation",
          () => new this.kit.PathBuilder(),
          (v) => v.delete(),
        ),
        color: [],
      };
      this.entries.set(stroke.key, entry);
      this.builds++;
    } else {
      if (
        !entry ||
        entry.culled ||
        entry.verbs !== stroke.from ||
        (entry.terminal && (!stroke.terminal || entry.verbs !== stroke.verbs))
      )
        throw Error("cache-prefix");
      this.hits++;
    }
    let offset = stroke.from;
    for (const page of stroke.pages) {
      if (
        page.code !== "ok" ||
        page.owner !== frame.state.owner ||
        page.session !== frame.state.session ||
        page.scene !== frame.state.scene ||
        page.mapping !== frame.state.mapping ||
        page.geometry !== stroke.geometry ||
        page.stroke !== stroke.id ||
        !entry.builder
      )
        throw Error("page-identity");
      const next = offset + BigInt(page.verbs.length);
      if (!page.verbs.length) {
        if (!stroke.culled || !page.done || stroke.from !== 0n || stroke.pages.length !== 1)
          throw Error("empty-page");
      } else if (
        next > stroke.verbs ||
        page.done !== (next === stroke.verbs) ||
        (!page.done && page.next !== next)
      )
        throw Error("page-cursor");
      if (
        entry.color.length &&
        [page.red, page.green, page.blue].some((c, i) => c !== entry.color[i])
      )
        throw Error("stroke-color-changed");
      entry.color = [page.red, page.green, page.blue, 1];
      measure.run("append-complete-page", () => appendPathPage(this.kit, entry.builder!, page));
      this.appendedVerbs += page.verbs.length;
      offset = next;
      measure.endBusy();
      await turn();
      measure.beginBusy();
    }
    if (!stroke.culled && offset !== stroke.verbs) throw Error("incomplete-stroke");
    entry.verbs = stroke.verbs;
    entry.culled = stroke.culled;
    if (stroke.terminal && !entry.terminal) {
      entry.path = measure.run(
        "terminal-detach",
        () => entry.builder!.detach(),
        (v) => v.delete(),
      );
      entry.builder!.delete();
      delete entry.builder;
    }
    entry.terminal = stroke.terminal;
  }
  drawable(stroke: Stroke, measure: Measure) {
    const entry = this.entries.get(stroke.key);
    if (!entry || entry.verbs !== stroke.verbs) throw Error("missing-path");
    if (entry.path) return { path: entry.path, transient: false, color: entry.color };
    return {
      path: measure.run(
        "active-snapshot",
        () => entry.builder!.snapshot(),
        (v) => v.delete(),
      ),
      transient: true,
      color: entry.color,
    };
  }
}
