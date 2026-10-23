import type { PageRecipe } from "./frame-recipe.ts";
export type PreparedPage = {
  recipe?: PageRecipe;
  page: bigint;
  data: Float32Array;
  release?: () => void;
  owner?: Entry;
};
export type Entry = {
  key: string;
  stroke: bigint;
  revision: bigint;
  detail: number;
  token: bigint;
  pages: PreparedPage[];
  bytes: number;
  used: number;
  admitted: number;
  pins: number;
  borrowers: number;
  stale: boolean;
};
