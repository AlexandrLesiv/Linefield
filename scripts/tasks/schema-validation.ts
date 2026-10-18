const keywords = new Set([
  "$schema",
  "title",
  "type",
  "properties",
  "required",
  "additionalProperties",
  "items",
  "maxItems",
  "minLength",
  "maxLength",
  "pattern",
  "minimum",
  "maximum",
  "enum",
  "const",
  "anyOf",
]);
function record(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
  );
}
function fail(location: string, reason: string): never {
  throw new Error(`${location}: ${reason}`);
}
function checkSchema(schema: unknown, depth = 0): asserts schema is Record<string, unknown> {
  if (depth > 24 || !record(schema)) fail("schema", "invalid or excessive schema nesting");
  for (const key of Object.keys(schema)) {
    if (!keywords.has(key)) fail("schema", `unsupported keyword ${key}`);
  }
  if (
    schema.$schema !== undefined &&
    schema.$schema !== "https://json-schema.org/draft/2020-12/schema"
  )
    fail("schema", "unsupported dialect");
  if (schema.title !== undefined && typeof schema.title !== "string")
    fail("schema", "invalid title");
  if (
    schema.type !== undefined &&
    !["object", "array", "string", "integer", "boolean", "null"].includes(String(schema.type))
  )
    fail("schema", "unsupported type");
  if (schema.additionalProperties !== undefined && schema.additionalProperties !== false)
    fail("schema", "only closed objects supported");
  if (
    schema.required !== undefined &&
    (!Array.isArray(schema.required) || !schema.required.every((v) => typeof v === "string"))
  )
    fail("schema", "invalid required list");
  for (const key of ["minLength", "maxLength", "maxItems", "minimum", "maximum"]) {
    const bound = schema[key];
    if (
      bound !== undefined &&
      (typeof bound !== "number" || !Number.isSafeInteger(bound) || bound < 0)
    )
      fail("schema", `invalid ${key}`);
  }
  if (schema.pattern !== undefined) {
    if (typeof schema.pattern !== "string" || schema.pattern.length > 500)
      fail("schema", "invalid pattern");
    new RegExp(schema.pattern, "u").test("");
  }
  for (const key of ["enum", "const"]) {
    const values = key === "enum" ? schema.enum : [schema.const];
    if (
      schema[key] !== undefined &&
      (!Array.isArray(values) ||
        values.length === 0 ||
        !values.every((v) => v === null || ["string", "number", "boolean"].includes(typeof v)))
    )
      fail("schema", `only primitive ${key} supported`);
  }
  if (schema.properties !== undefined) {
    if (!record(schema.properties)) fail("schema", "invalid properties");
    for (const child of Object.values(schema.properties)) checkSchema(child, depth + 1);
  }
  if (schema.items !== undefined) checkSchema(schema.items, depth + 1);
  if (schema.anyOf !== undefined) {
    if (!Array.isArray(schema.anyOf) || schema.anyOf.length < 1 || schema.anyOf.length > 8)
      fail("schema", "invalid alternatives");
    for (const child of schema.anyOf) checkSchema(child, depth + 1);
  }
}
function matches(
  value: unknown,
  schema: Record<string, unknown>,
  location: string,
  depth: number,
): void {
  if (depth > 24) fail(location, "excessive nesting");
  if (schema.anyOf !== undefined) {
    const alternatives = schema.anyOf as Record<string, unknown>[];
    if (
      !alternatives.some((child) => {
        try {
          matches(value, child, location, depth + 1);
          return true;
        } catch {
          return false;
        }
      })
    )
      fail(location, "no alternative matches");
  }
  if (schema.const !== undefined && value !== schema.const) fail(location, "constant differs");
  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) fail(location, "unknown value");
  const type = schema.type;
  if (type === "null" && value !== null) fail(location, "expected null");
  if (type === "boolean" && typeof value !== "boolean") fail(location, "expected boolean");
  if (type === "integer") {
    if (typeof value !== "number" || !Number.isSafeInteger(value))
      fail(location, "expected integer");
    if (typeof schema.minimum === "number" && value < schema.minimum)
      fail(location, "below minimum");
    if (typeof schema.maximum === "number" && value > schema.maximum)
      fail(location, "above maximum");
  }
  if (type === "string") {
    if (typeof value !== "string") fail(location, "expected string");
    const length = [...value].length;
    if (typeof schema.minLength === "number" && length < schema.minLength)
      fail(location, "too short");
    if (typeof schema.maxLength === "number" && length > schema.maxLength)
      fail(location, "too long");
    if (typeof schema.pattern === "string" && !new RegExp(schema.pattern, "u").test(value))
      fail(location, "invalid format");
  }
  if (type === "array") {
    if (!Array.isArray(value)) fail(location, "expected array");
    if (typeof schema.maxItems === "number" && value.length > schema.maxItems)
      fail(location, "too many items");
    if (record(schema.items))
      value.forEach((item, index) =>
        matches(item, schema.items as Record<string, unknown>, `${location}[${index}]`, depth + 1),
      );
  }
  if (type === "object") {
    if (!record(value)) fail(location, "expected plain object");
    const properties = record(schema.properties) ? schema.properties : {};
    for (const name of (schema.required ?? []) as string[]) {
      if (!Object.hasOwn(value, name)) fail(location, `missing ${name}`);
    }
    for (const [name, child] of Object.entries(value)) {
      if (!Object.hasOwn(properties, name)) {
        if (schema.additionalProperties === false) fail(location, `unknown property ${name}`);
      } else
        matches(
          child,
          properties[name] as Record<string, unknown>,
          `${location}.${name}`,
          depth + 1,
        );
    }
  }
}
/** Owned-schema subset only. Never fetches schemas or evaluates task code. */
export function validateAgainstSchema(value: unknown, schema: unknown): void {
  checkSchema(schema);
  matches(value, schema, "task", 0);
}
