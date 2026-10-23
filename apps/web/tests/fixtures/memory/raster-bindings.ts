import * as api from "#memory-bindings";
type Action = "fixtureRasterBegin" | "fixtureRasterUpdate" | "fixtureRasterTerminal";
function invoke(name: string, args: unknown[]): unknown {
  const fn: unknown = Reflect.get(api, name);
  if (typeof fn !== "function") throw Error(`missing generated fixture ${name}`);
  return Reflect.apply(fn, undefined, args);
}
export function farRaster() {
  const result = invoke("fixtureFarView", [9007199254740993n, 65535.99999999999]);
  if (!(result instanceof api.Reply)) throw Error("far fixture snapshot");
  try {
    if (result.code !== "ok") throw Error("far setup");
  } finally {
    result.free();
  }
}
// Checked fixture reflection follows existing production-typed fixture helpers.
// No private generated declaration path or unchecked snapshot cast is required.
export function rasterCommand(name: Action, args: unknown[]) {
  const ctor: unknown = Reflect.get(api, "RasterProofSnapshot");
  if (typeof ctor !== "function") throw Error("missing generated RasterProofSnapshot");
  const result = invoke(name, args);
  if (!(result instanceof ctor)) throw Error("wrong generated raster snapshot");
  const free: unknown = Reflect.get(result, "free");
  if (typeof free !== "function") throw Error("missing snapshot destruction");
  const read = (key: string): unknown => Reflect.get(result, key);
  const string = (key: string) => {
    const value = read(key);
    if (typeof value !== "string") throw Error(`snapshot string ${key}`);
    return value;
  };
  const integer = (key: string) => {
    const value = read(key);
    if (typeof value !== "number" || !Number.isSafeInteger(value))
      throw Error(`snapshot integer ${key}`);
    return value;
  };
  const identity = (key: string) => {
    const value = read(key);
    if (typeof value !== "bigint") throw Error(`snapshot bigint ${key}`);
    return String(value);
  };
  const boolean = (key: string) => {
    const value = read(key);
    if (typeof value !== "boolean") throw Error(`snapshot boolean ${key}`);
    return value;
  };
  try {
    return {
      code: string("code"),
      owner: identity("owner"),
      session: identity("session"),
      interaction: identity("interaction"),
      mapping: identity("mapping"),
      cancelled: boolean("activeCancelled"),
      epoch: identity("epoch"),
      enabled: boolean("enabled"),
      outcome: string("outcome"),
      x: integer("offsetX"),
      y: integer("offsetY"),
      layout: ["rasterBytes", "frameBytes", "tailBytes", "registryBytes", "stateBytes"].map(
        integer,
      ),
    };
  } finally {
    Reflect.apply(free, result, []);
  }
}
