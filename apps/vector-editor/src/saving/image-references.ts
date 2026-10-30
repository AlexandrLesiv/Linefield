import { checkedImageCore } from "../image-boundary";
import type { Storage } from "./adapter";
export type AssetReference = {
  digest: string;
  version: number;
  mime: number;
  width: number;
  height: number;
  bytes: number;
};
export async function verifyImageReferences(
  raw: unknown,
  token: number,
  store: Storage,
  yieldWork: () => Promise<void>,
  restore = false,
) {
  const core = checkedImageCore(raw);
  let index = 0,
    first = true;
  for (;;) {
    await yieldWork();
    const references: AssetReference[] = [];
    let done = false;
    for (let inspected = 0; inspected < 32; inspected++) {
      const state = restore
        ? core.image_restore_asset(token, index++)
        : core.image_idle_asset_next(token, first ? 1 : 0);
      first = false;
      if (state === 2) {
        done = true;
        break;
      }
      if (restore && state === 3) continue;
      if (state !== 1) throw Error("storage-image-boundary");
      const values = new Float64Array(core.memory.buffer, core.image_asset_output_ptr(), 5);
      const digest = new TextDecoder().decode(
        new Uint8Array(core.memory.buffer, core.image_asset_digest_ptr(), 64),
      );
      references.push({
        digest,
        version: values[0],
        mime: values[1],
        width: values[2],
        height: values[3],
        bytes: values[4],
      });
    }
    if (references.length) await store.verifyAssets(references);
    if (done) return;
  }
}
