import { createPaperContactMaterial } from "../../../../vector-editor/src/paper-contact-material";
import type { PaperContactMaterial } from "../../../../vector-editor/src/paper-contact-material";
const next = () => new Promise<number>((resolve) => requestAnimationFrame(resolve));
async function run(variant: "sync" | "worker" | "asset") {
  const frames: number[] = [],
    tasks: number[] = [];
  let running = true,
    previous = await next();
  const tick = (time: number) => {
    frames.push(time - previous);
    previous = time;
    if (running) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) tasks.push(entry.duration);
  });
  observer.observe({ type: "longtask" });
  const start = performance.now();
  let material: PaperContactMaterial,
    bakeMs: number | null = null;
  if (variant === "sync") {
    material = createPaperContactMaterial();
    bakeMs = performance.now() - start;
  } else if (variant === "worker") {
    const worker = new Worker(new URL("./material-worker.ts", import.meta.url), { type: "module" });
    const result = await new Promise<{ material: PaperContactMaterial; bakeMs: number }>(
      (resolve, reject) => {
        const timeout = setTimeout(() => {
          worker.terminate();
          reject(Error("Material worker timeout"));
        }, 10000);
        worker.onerror = () => {
          clearTimeout(timeout);
          reject(Error("Material worker failure"));
        };
        worker.onmessage = ({ data }) => {
          clearTimeout(timeout);
          resolve(data);
        };
        worker.postMessage({});
      },
    );
    worker.terminate();
    material = result.material;
    bakeMs = result.bakeMs;
  } else {
    const response = await fetch("/.build-cache/restart/worker-material/paper-contact-v1.bin", {
      cache: "no-store",
    });
    if (!response.ok) throw Error("Material asset unavailable");
    material = {
      data: new Uint8Array(await response.arrayBuffer()),
      size: 512,
      levels: 64,
      levelsPerGrade: 32,
      period: 64,
      thresholdMin: 0,
      thresholdMax: 1.125,
    };
  }
  const readyMs = performance.now() - start;
  await next();
  await new Promise((resolve) => setTimeout(resolve, 0));
  running = false;
  observer.disconnect();
  const canvas = document.querySelector("canvas")!;
  const gl = canvas.getContext("webgl2")!;
  const texture = gl.createTexture();
  const uploadStart = performance.now();
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
  gl.texImage3D(
    gl.TEXTURE_2D_ARRAY,
    0,
    gl.R8,
    material.size,
    material.size,
    material.levels,
    0,
    gl.RED,
    gl.UNSIGNED_BYTE,
    material.data,
  );
  gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.REPEAT);
  const uploadSubmissionMs = performance.now() - uploadStart;
  const fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0)!;
  gl.flush();
  const fenceStart = performance.now();
  while (gl.clientWaitSync(fence, 0, 0) === gl.TIMEOUT_EXPIRED) {
    if (performance.now() - fenceStart > 10000) throw Error("GPU completion timeout");
    await next();
  }
  const uploadCompletionProxyMs = performance.now() - uploadStart;
  gl.deleteSync(fence);
  if (gl.getError() !== gl.NO_ERROR) throw Error("Material upload failure");
  if (!(material.data.buffer instanceof ArrayBuffer))
    throw Error("Unexpected shared material buffer");
  const digest = await crypto.subtle.digest("SHA-256", material.data.buffer);
  const hash = Array.from(new Uint8Array(digest), (x) => x.toString(16).padStart(2, "0")).join("");
  // Read every level-zero layer back after timing: texture values must be identical.
  const framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  const pixels = new Uint8Array(512 * 512 * 4);
  for (let layer = 0; layer < 64; layer++) {
    gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, texture, 0, layer);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE)
      throw Error("Incomplete material layer");
    gl.readPixels(0, 0, 512, 512, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    for (let i = 0; i < 512 * 512; i++)
      if (pixels[i * 4] !== material.data[layer * 512 * 512 + i])
        throw Error("Material upload mismatch");
  }
  if (gl.getError() !== gl.NO_ERROR) throw Error("Material readback error");
  gl.deleteFramebuffer(framebuffer);
  gl.deleteTexture(texture);
  return {
    variant,
    readyMs,
    bakeMs,
    uploadSubmissionMs,
    uploadCompletionProxyMs,
    hash,
    bytes: material.data.byteLength,
    frames,
    tasks,
    textureBytes: (64 * (4 * 512 * 512 - 1)) / 3,
    readbackExact: true,
  };
}
Object.assign(window, { materialExperiment: run });
