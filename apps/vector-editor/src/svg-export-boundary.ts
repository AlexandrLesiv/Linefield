import { svgExportArity, svgExportFingerprint, type SvgExportCore } from "./svg-export-core";
export function checkedSvgExportCore(value: unknown): SvgExportCore {
  if (typeof value !== "object" || value === null) throw Error("svg-boundary");
  const exports = value as Record<string, unknown>;
  if (!(exports.memory instanceof WebAssembly.Memory)) throw Error("svg-boundary");
  for (const [name, arity] of Object.entries(svgExportArity))
    if (typeof exports[name] !== "function" || exports[name].length !== arity)
      throw Error("svg-boundary");
  const core = value as SvgExportCore;
  if (svgExportFingerprint.some((word, i) => core.svg_boundary_fingerprint(i) >>> 0 !== word))
    throw Error("svg-boundary");
  return core;
}
