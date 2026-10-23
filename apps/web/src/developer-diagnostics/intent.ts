import type { DiagnosticEvent } from "./schema.ts";
import type { Commands } from "../memory/input-state.ts";
type Origin = NonNullable<DiagnosticEvent["origin"]>;
type Pointer = NonNullable<DiagnosticEvent["pointer"]>;
let current: { origin: Origin; pointer?: Pointer } | undefined;
export function currentIntent() {
  return current;
}
/** Synchronous metadata scope only; never a queue, command dispatcher or async context. */
export function withIntent<T>(origin: Origin, action: () => T, pointer?: Pointer): T {
  const previous = current;
  current = pointer ? { origin, pointer } : { origin };
  try {
    return action();
  } finally {
    current = previous;
  }
}
export function toolbarCommands(source: Commands): Commands {
  return {
    ...source,
    run: (action, timing) => withIntent("toolbar", () => source.run(action, timing)),
  };
}
export function keyboardIntent(action: (event: KeyboardEvent) => void) {
  return (event: KeyboardEvent) => withIntent("keyboard", () => action(event));
}
