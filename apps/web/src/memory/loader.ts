import CanvasKitInit from "canvaskit-wasm";
import canvasWasm from "canvaskit-wasm/bin/canvaskit.wasm?url";
import init from "#memory-bindings";
import { bridge } from "./bridge.ts";
let engine: ReturnType<typeof init> | undefined;
let renderer: ReturnType<typeof CanvasKitInit> | undefined;
export async function loadEngine() {
  engine ??= init().catch((error: unknown) => {
    engine = undefined;
    throw error;
  });
  const module = await engine;
  return { bridge, bytes: () => module.memory.buffer.byteLength };
}
export function loadRenderer() {
  renderer ??= CanvasKitInit({ locateFile: () => canvasWasm }).catch((error: unknown) => {
    renderer = undefined;
    throw error;
  });
  return renderer;
}
