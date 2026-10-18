// A deliberately bounded DTCG 2025.10 consumer, not a general format validator.
export type TokenLookup = (path: string, type: string) => string;
type Entry = { type: string; value: unknown };
export function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function scalar(type: string, value: unknown): string {
  if (type === "color" && record(value) && value.colorSpace === "srgb") {
    const components = value.components;
    if (
      Array.isArray(components) &&
      components.length === 3 &&
      components.every(
        (part: unknown) =>
          typeof part === "number" && Number.isFinite(part) && part >= 0 && part <= 1,
      ) &&
      (value.alpha === undefined || value.alpha === 1)
    ) {
      return (
        "#" +
        components
          .map((part: number) =>
            Math.round(part * 255)
              .toString(16)
              .padStart(2, "0"),
          )
          .join("")
          .toUpperCase()
      );
    }
  }
  if (
    type === "dimension" &&
    record(value) &&
    value.unit === "px" &&
    typeof value.value === "number" &&
    Number.isFinite(value.value)
  )
    return String(value.value);
  if (
    (type === "number" || type === "fontWeight") &&
    typeof value === "number" &&
    Number.isFinite(value) &&
    (type !== "fontWeight" || (value >= 1 && value <= 1000))
  )
    return String(value);
  if (
    type === "fontFamily" &&
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (part: unknown) =>
        typeof part === "string" && /^[a-zA-Z][a-zA-Z -]*$|^-[a-zA-Z-]+$/.test(part),
    )
  )
    return value.map((part: string) => (part.includes(" ") ? `"${part}"` : part)).join(",");
  throw new Error(`Unsupported or invalid ${type} token value`);
}
export function loadTokens(input: unknown): TokenLookup {
  const entries = new Map<string, Entry>();
  function visit(value: unknown, path: string, inherited?: string): void {
    if (!record(value)) throw new Error(`Invalid token group: ${path}`);
    const directives = new Set(["$type", "$value", "$description", "$extensions"]);
    for (const key of Object.keys(value)) {
      if ((key.startsWith("$") || "$value" in value) && !directives.has(key))
        throw new Error(`Unsupported token directive or property: ${key}`);
    }
    if (value.$type !== undefined && typeof value.$type !== "string")
      throw new Error(`Invalid token type: ${path}`);
    if (value.$description !== undefined && typeof value.$description !== "string")
      throw new Error(`Invalid token description: ${path}`);
    if (value.$extensions !== undefined && !record(value.$extensions))
      throw new Error(`Invalid token extensions: ${path}`);
    const type = value.$type ?? inherited;
    if ("$value" in value) {
      if (typeof type !== "string") throw new Error(`Missing token type: ${path}`);
      entries.set(path, { type, value: value.$value });
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      if (key.startsWith("$")) continue;
      if (!/^[a-zA-Z][a-zA-Z0-9-]*$/.test(key)) throw new Error("Invalid token name");
      visit(child, path ? `${path}.${key}` : key, typeof type === "string" ? type : undefined);
    }
  }
  visit(input, "");
  function resolve(path: string, type: string, seen = new Set<string>()): string {
    if (seen.has(path)) throw new Error(`Cyclic token reference: ${path}`);
    const entry = entries.get(path);
    if (!entry) throw new Error(`Missing token: ${path}`);
    if (entry.type !== type) throw new Error(`Token type mismatch: ${path}`);
    seen.add(path);
    if (typeof entry.value === "string" && /^\{[a-zA-Z0-9.-]+\}$/.test(entry.value)) {
      return resolve(entry.value.slice(1, -1), type, seen);
    }
    return scalar(type, entry.value);
  }
  for (const [path, entry] of entries) resolve(path, entry.type);
  return resolve;
}
