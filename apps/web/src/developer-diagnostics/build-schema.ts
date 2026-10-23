export interface BuildIdentity {
  readonly app: string;
  readonly engine: string;
  readonly preparation: string;
}
export function safeBuild(build: BuildIdentity): Readonly<BuildIdentity> {
  const clean = (value: string, role: "app" | "engine" | "preparation") => {
    if (typeof value !== "string" || value.length > 128 || /[^a-zA-Z0-9_.-]/.test(value))
      return "unavailable";
    const prefix =
      role === "app"
        ? "index-"
        : role === "engine"
          ? "linefield_web_memory_bg-"
          : "linefield_web_preparation_bg-";
    const suffix = role === "app" ? ".js" : ".wasm";
    const hash = value.slice(prefix.length, -suffix.length);
    return value.startsWith(prefix) && value.endsWith(suffix) && /^[a-zA-Z0-9_-]{6,64}$/.test(hash)
      ? value
      : "unavailable";
  };
  return Object.freeze({
    app: clean(build.app, "app"),
    engine: clean(build.engine, "engine"),
    preparation: clean(build.preparation, "preparation"),
  });
}
