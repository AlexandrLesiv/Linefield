export interface Drawing {
  id: string;
  name: string;
  image: string | null;
  deleted: boolean;
}
export function sampleDrawings(): Drawing[] {
  return [
    "Coastal house",
    "Morning objects",
    "Mountain study",
    "Garden leaves",
    "City corners",
    "Untitled",
  ].map((name, index) => ({
    id: "sample-" + index,
    name,
    image: "/artwork/drawing-" + (index + 1) + ".png",
    deleted: false,
  }));
}
