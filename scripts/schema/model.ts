export interface Column {
  name: string;
  type: string;
  notNull: boolean;
  primaryKey: number;
  unique: boolean;
  note: string;
}
export interface Index {
  name: string;
  columns: string[];
  unique: boolean;
  primaryKey: boolean;
  partial: boolean;
  sql: string | null;
}
export interface Relationship {
  database: string;
  table: string;
  columns: string[];
  targetTable: string;
  targetColumns: string[];
  onDelete: string;
  onUpdate: string;
}
export interface Table {
  database: string;
  name: string;
  columns: Column[];
  indexes: Index[];
  note: string;
  sql: string | null;
  authority: "reference-sql" | "proposal-only";
}
export interface Schema {
  version: string;
  sources: { path: string; sha256: string }[];
  projectNote: string;
  groups: { name: string; tables: string[] }[];
  tables: Table[];
  relationships: Relationship[];
}
export function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error("Expected schema record");
  return value as Record<string, unknown>;
}
export function list(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error("Expected schema list");
  return value;
}
export function text(value: unknown): string {
  if (typeof value !== "string") throw new Error("Expected schema text");
  return value;
}
export function identifier(value: unknown): string {
  const result = text(value);
  if (!/^[a-z][a-z0-9_]*$/.test(result)) throw new Error("Invalid schema identifier");
  return result;
}
export function boolean(value: unknown): boolean {
  if (typeof value !== "boolean") throw new Error("Expected schema boolean");
  return value;
}
export function number(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value))
    throw new Error("Expected schema integer");
  return value;
}
export function names(value: unknown): string[] {
  return list(value).map(identifier);
}
