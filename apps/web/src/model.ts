export interface Drawing {
  id: string;
  name: string;
  image: string | null;
  deleted: boolean;
}
export const platforms = [
  "web",
  "macos",
  "windows",
  "linux",
  "ios",
  "ipados",
  "android",
  "chromeos",
  "watchos",
  "wearos",
  "tvos",
  "android-tv",
  "visionos",
  "android-xr",
] as const;
export type Platform = (typeof platforms)[number];
export const labels: Record<Platform, string> = {
  web: "Web",
  macos: "macOS",
  windows: "Windows",
  linux: "Linux",
  ios: "iPhone",
  ipados: "iPad",
  android: "Android",
  chromeos: "ChromeOS",
  watchos: "watchOS",
  wearos: "Wear OS",
  tvos: "tvOS",
  "android-tv": "Android TV",
  visionos: "visionOS",
  "android-xr": "Android XR",
};
export function viewer(platform: Platform): boolean {
  return ["watchos", "wearos", "tvos", "android-tv"].includes(platform);
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
export function readPlatform(): Platform {
  const value = new URL(location.href).searchParams.get("platform");
  return platforms.find((item) => item === value) || "web";
}

/** Explicit review links opt in; normal web entry has no platform switcher. */
export function previewControlsEnabled(): boolean {
  const query = new URL(location.href).searchParams;
  return query.get("preview") === "1" || platforms.some((item) => item === query.get("platform"));
}
