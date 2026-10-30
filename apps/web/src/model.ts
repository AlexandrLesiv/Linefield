export interface Drawing {
  id: string;
  name: string;
  image: string | null;
  deleted: boolean;
  incarnation: string;
  deletionToken?: string;
  updated?: number;
}
export const savedDrawing = (entry: {
  id: string;
  title: string;
  updated: number;
  incarnation: string;
}): Drawing => ({
  id: entry.id,
  incarnation: entry.incarnation,
  name: entry.title,
  updated: entry.updated,
  image: null,
  deleted: false,
});
