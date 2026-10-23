import type { PreparedPage } from "./prepared-ownership.ts";
export type PageRecipe = Readonly<{ detail: number; unclipped: boolean }>;
export type Recipe = {
  eligible: boolean;
  detail: number;
  renderer: number;
  epoch: bigint;
  offset: readonly [number, number];
  contributors: number;
};
export function recipe(detail: number, renderer: number, inherited?: Recipe): Recipe {
  return inherited
    ? { ...inherited }
    : { eligible: true, detail, renderer, epoch: 0n, offset: [0, 0], contributors: 0 };
}
export function contribute(
  value: Recipe,
  page: PreparedPage,
  epoch: bigint,
  offset: readonly [number, number],
) {
  if (!page.recipe?.unclipped || page.recipe.detail !== value.detail || epoch === 0n)
    value.eligible = false;
  if (
    value.contributors &&
    (value.epoch !== epoch || value.offset[0] !== offset[0] || value.offset[1] !== offset[1])
  )
    value.eligible = false;
  value.epoch = epoch;
  value.offset = offset;
  value.contributors = Math.min(Number.MAX_SAFE_INTEGER, value.contributors + 1);
}
export function eligible(
  value: Recipe | undefined,
  detail: number,
  renderer: number,
): value is Recipe {
  return (
    !!value?.eligible &&
    value.renderer === renderer &&
    value.contributors > 0 &&
    value.detail === detail &&
    value.epoch !== 0n
  );
}
