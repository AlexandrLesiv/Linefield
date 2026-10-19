export type Case = {
  id: string;
  shape: "coincident" | "line" | "diagonal" | "pressure" | "retraced" | "crossing";
  samples: number;
  width: number;
  pressure: boolean;
  zoom: number;
  phase: readonly [number, number];
  anchor: "center" | "left" | "corner" | "bottom-right";
  rotation: number;
};
const basic: Omit<Case, "id" | "shape"> = {
  samples: 256,
  width: 8,
  pressure: false,
  zoom: 1,
  phase: [0.375, 0.625],
  anchor: "center",
  rotation: 0,
};
// Frozen R06 corpus v1. Synthetic input only; geometry always comes from Rust.
export const cases: readonly Case[] = [
  { ...basic, id: "control-256", shape: "coincident" },
  { ...basic, id: "coincident-integer", shape: "coincident", phase: [0, 0] },
  { ...basic, id: "coincident-half", shape: "coincident", phase: [0.5, 0.5] },
  { ...basic, id: "internal-vertical-edge", shape: "coincident", phase: [0.375, 64.625] },
  { ...basic, id: "internal-horizontal-edge", shape: "coincident", phase: [64.375, 0.625] },
  {
    ...basic,
    id: "thin-horizontal",
    shape: "line",
    samples: 2,
    width: 1,
    pressure: true,
    zoom: 0.1,
    phase: [0, 0.125],
  },
  {
    ...basic,
    id: "thin-diagonal",
    shape: "diagonal",
    samples: 2,
    width: 1,
    pressure: true,
    zoom: 0.1,
    phase: [0.125, 0.875],
  },
  { ...basic, id: "pressure-transition", shape: "pressure", samples: 8, width: 32, pressure: true },
  { ...basic, id: "retraced-64", shape: "retraced", samples: 64 },
  { ...basic, id: "self-crossing", shape: "crossing", samples: 4 },
  { ...basic, id: "rotated-crossing-15", shape: "crossing", samples: 4, rotation: 1 },
  {
    ...basic,
    id: "rotated-pressure-45",
    shape: "pressure",
    samples: 8,
    width: 32,
    pressure: true,
    rotation: 3,
  },
  {
    ...basic,
    id: "rotated-thin-90",
    shape: "line",
    samples: 2,
    width: 1,
    pressure: true,
    zoom: 0.1,
    rotation: 6,
  },
  { ...basic, id: "outer-left", shape: "coincident", samples: 8, width: 32, anchor: "left" },
  { ...basic, id: "outer-corner", shape: "coincident", samples: 8, width: 32, anchor: "corner" },
  {
    ...basic,
    id: "outer-bottom-right",
    shape: "coincident",
    samples: 8,
    width: 32,
    anchor: "bottom-right",
  },
];
export const sizes = [
  { id: "small", width: 1024, height: 768 },
  { id: "large", width: 4096, height: 2048 },
] as const;
export const halos = [1, 2, 4, 8] as const;
