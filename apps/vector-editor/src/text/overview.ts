import type { TextRecord } from "./records";
import type { TextJob } from "./cache";
export function textOverview(record: TextRecord, text: string): TextJob {
  const density = Math.min(1, 512 / Math.max(record.width, record.height));
  return {
    record,
    text,
    tile: {
      x: 0,
      y: 0,
      width: record.width,
      height: record.height,
      density,
      key: `${record.generation}:${record.id}:overview`,
    },
  };
}
