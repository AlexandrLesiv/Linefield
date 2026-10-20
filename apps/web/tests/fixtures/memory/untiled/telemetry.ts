import type { Unit } from "./protocol.ts";
export const hostUnits: Unit[] = [];
export function stage(name: string) {
  // Synthetic fixture metadata only; lets the out-of-process driver watch blocked main work.
  console.info(`r07-stage:${name}`);
}
export function hostUnit<T>(name: string, action: () => T, guarded = false): T {
  stage(name);
  const start = performance.now();
  const result = action();
  const ms = performance.now() - start;
  hostUnits.push({ stage: name, ms });
  if (guarded && ms > 8) throw Error(`operation-guard:${name}`);
  return result;
}
