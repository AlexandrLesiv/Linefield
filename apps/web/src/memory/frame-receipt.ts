import type { Recipe } from "./frame-recipe.ts";
export type Receipt = { id: bigint; through: bigint; key: string; recipe?: Recipe };
