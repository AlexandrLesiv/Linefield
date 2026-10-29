/** Gesture profiles distinguish visible small drags from offscreen full-scale edits. */
export function gestureCases(sourceExtent) {
  if (!sourceExtent)
    return [
      ["rotate", 0.31, false],
      ["rotate", -0.41, true],
      ["rotate", 0.41, true],
      ["resize", 1.5, false],
      ["resize", 0.5, false],
    ];
  const far = process.env.LINEFIELD_FAR_CORNER === "1";
  return [
    ["rotate", 0.31, false],
    ["rotate", -0.31, false],
    ["resize", far ? 1.5 : 1 + 40 / sourceExtent, false],
    ["resize", far ? 0.5 : 1 - 40 / sourceExtent, false],
  ];
}
