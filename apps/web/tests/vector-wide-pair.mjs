/** Accumulate all exact-image failures without stopping coverage at the first brush. */
export function compareWidePair([compact, wide]) {
  return ["before", "sliced", "rotated", "moved"].flatMap((field) =>
    JSON.stringify(compact[field]) === JSON.stringify(wide[field])
      ? []
      : [`Compact/wide ${field} differs: extent=${compact.extent}, brush=${compact.brush}`],
  );
}
