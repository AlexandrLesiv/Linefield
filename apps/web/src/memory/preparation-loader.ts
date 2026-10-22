import initialize, { prepareBegin } from "#preparation-bindings";
let loaded: ReturnType<typeof initialize> | undefined;
let memory: WebAssembly.Memory | undefined;
export async function loadPreparation() {
  loaded ??= initialize();
  const exports = await loaded;
  memory = exports.memory;
  return prepareBegin;
}
export const preparationHeap = () => memory?.buffer.byteLength ?? 0;
