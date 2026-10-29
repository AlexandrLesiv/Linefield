export interface Drawing {
  id: string;
  name: string;
  image: string | null;
  deleted: boolean;
  updated?: number;
}
export const savedDrawing = (entry: { id: string; title: string; updated: number }): Drawing => ({
  id: entry.id,
  name: entry.title,
  updated: entry.updated,
  image: null,
  deleted: false,
});
