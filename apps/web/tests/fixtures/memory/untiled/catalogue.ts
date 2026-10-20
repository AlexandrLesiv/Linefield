export const shapes = ["coincident", "moving", "sparse", "varying"] as const;
export type Shape = (typeof shapes)[number];
