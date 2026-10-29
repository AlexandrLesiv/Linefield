import { persistence } from "/transport.js";
import { runIncremental } from "/incremental.js";
export async function roundtrips() {
  const compiled = await WebAssembly.compile(await (await fetch("/engine.wasm")).arrayBuffer());
  const load = async () => (await WebAssembly.instantiate(compiled)).exports;
  const runs = [];
  for (const [pool, fault] of [
    ["roundtrip", undefined],
    ["lostreply", "after-commit"],
    ["rollback", "before-commit"],
  ]) {
    const store = await persistence(pool, fault);
    try {
      runs.push({ fault: fault || null, result: await runIncremental(load, store) });
    } finally {
      await store.close();
    }
  }
  return runs;
}
