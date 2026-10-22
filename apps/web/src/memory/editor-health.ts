// Unexpected canonical-editor boundary exceptions are terminal for this module instance.
// Typed command rejection codes are ordinary values and never poison the editor.
let healthy = true;
// One outstanding snapshot at most. Keep a copy-failed wrapper alive so wasm-bindgen's
// FinalizationRegistry cannot re-enter the poisoned instance later. Cleared only by page exit.
const terminalSnapshots: { free: () => void }[] = [];
export const editorHealthy = () => healthy;
function call<T>(action: () => T): T {
  if (!healthy) throw Error("editor-fatal");
  try {
    return action();
  } catch (error) {
    healthy = false;
    throw error;
  }
}
export function editorSnapshot<T extends { free: () => void }, R>(
  action: () => T,
  copy: (value: T) => R,
): R {
  const value = call(action);
  try {
    return call(() => copy(value));
  } finally {
    // A destructor also enters Wasm. Never re-enter after an action/getter trapped.
    if (healthy) call(() => value.free());
    else if (terminalSnapshots.length === 0) terminalSnapshots.push(value);
  }
}
