import type { Core } from "./core";
import { checkedTextCore } from "./text-boundary";
import { checkedImageCore } from "./image-boundary";
import { IMAGE_HANDLE, TEXT_HANDLE } from "./image-selection";

/** Read-only presentation cache of the engine's insertion-ordered selection.
 * No host mutation is applied until the owning engine accepts it.
 */
export class SessionSelection implements Iterable<number> {
  private revision = -1;
  private snapshot: ReadonlySet<number> = new Set();
  private images;
  private texts;
  constructor(private core: Core) {
    this.images = checkedImageCore(core);
    this.texts = checkedTextCore(core);
  }
  private read(): ReadonlySet<number> {
    const revision = this.core.session_selection_revision();
    if (revision === this.revision) return this.snapshot;
    const count = this.core.session_selection_snapshot();
    if (count === 0xffffffff) throw new Error("Selection snapshot allocation failed");
    const pointer = this.core.session_selection_snapshot_ptr();
    const memory = this.core.memory.buffer;
    if (
      !Number.isInteger(count) ||
      count < 0 ||
      count > this.core.count() + this.images.image_count() + this.texts.text_count() ||
      pointer % 8 !== 0 ||
      pointer + count * 8 > memory.byteLength
    )
      throw new Error("Invalid selection snapshot boundary");
    const ids = new Float64Array(memory, pointer, count);
    const snapshot = new Set<number>();
    for (const id of ids) {
      if (
        !Number.isSafeInteger(id) ||
        id < 0 ||
        (id < TEXT_HANDLE
          ? id >= this.core.count()
          : id < IMAGE_HANDLE
            ? !this.texts.text_exists(id)
            : id > 0xffffffff || !this.images.image_exists(id))
      )
        throw new Error("Invalid selected object identity");
      snapshot.add(id);
    }
    if (snapshot.size !== count) throw new Error("Duplicate selected stroke identity");
    this.snapshot = snapshot;
    this.revision = revision;
    return snapshot;
  }
  get size(): number {
    return this.read().size;
  }
  has(id: number): boolean {
    return !!this.core.session_selection_has(id);
  }
  add(id: number): void {
    if (!this.core.session_selection_set(id, 1)) throw new Error("Selection update rejected");
  }
  delete(id: number): void {
    if (!this.core.session_selection_set(id, 0)) throw new Error("Selection update rejected");
  }
  clear(): void {
    this.core.session_selection_clear();
  }
  prune(): void {
    this.core.session_selection_prune();
  }
  values(): SetIterator<number> {
    return this.read().values();
  }
  [Symbol.iterator](): SetIterator<number> {
    return this.values();
  }
}
