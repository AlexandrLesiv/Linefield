import { storage } from "./adapter";
import { checkedSaveCore } from "./types";
import { restore } from "./restore";
import { scheduler } from "./scheduler";
import { writeJson } from "./prepare";
export async function createSaving(rawCore: unknown) {
  const core = checkedSaveCore(rawCore),
    store = await storage(new URL(location.href).searchParams.get("document") || "");
  try {
    await restore(core, await store.load(), store);
    if (
      core.save_configure(writeJson(core, { ...store.identity, session: crypto.randomUUID() })) !==
      1
    )
      throw Error("save-configuration");
    return scheduler(core, store);
  } catch (error) {
    store.terminate();
    throw error;
  }
}
export type Saving = Awaited<ReturnType<typeof createSaving>>;
export type { State } from "./types";
