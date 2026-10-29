import { t } from "../../web/src/locale";

/** Synchronous resource construction only: roll back all allocations if a later
 * constructor fails. Wrappers are removed before any rendering or input resumes. */
export function buildGpuResources<T>(gl: WebGL2RenderingContext, build: () => T): T {
  const pairs = [
    ["createBuffer", "deleteBuffer"],
    ["createTexture", "deleteTexture"],
    ["createFramebuffer", "deleteFramebuffer"],
    ["createRenderbuffer", "deleteRenderbuffer"],
    ["createVertexArray", "deleteVertexArray"],
    ["createProgram", "deleteProgram"],
    ["createShader", "deleteShader"],
    ["createQuery", "deleteQuery"],
    ["createSampler", "deleteSampler"],
    ["createTransformFeedback", "deleteTransformFeedback"],
  ] as const;
  const cleanup: (() => void)[] = [],
    restore: (() => void)[] = [];
  try {
    for (const [create, remove] of pairs) {
      const descriptor = Object.getOwnPropertyDescriptor(gl, create);
      const original = gl[create].bind(gl) as (...args: unknown[]) => unknown;
      const dispose = gl[remove].bind(gl) as (resource: unknown) => void;
      Object.defineProperty(gl, create, {
        configurable: true,
        writable: true,
        value: (...args: unknown[]) => {
          const resource = original(...args);
          if (!resource) throw Error(`GPU allocation failed: ${create}`);
          cleanup.push(() => dispose(resource));
          return resource;
        },
      });
      restore.push(() =>
        descriptor
          ? Object.defineProperty(gl, create, descriptor)
          : Reflect.deleteProperty(gl, create),
      );
    }
    const result = build();
    const error = gl.getError();
    if (error !== gl.NO_ERROR) throw Error(`GPU reconstruction failed: ${error}`);
    return result;
  } catch (error) {
    for (const dispose of cleanup.reverse()) dispose();
    throw error;
  } finally {
    for (const reset of restore.reverse()) reset();
  }
}

/** Three bounded automatic attempts, then an explicit retry; never reloads or
 * replaces the owning engine. A new context loss cancels the previous cycle. */
export function installGpuRecovery(
  canvas: HTMLCanvasElement,
  rebuild: () => void,
  failure: (message: string) => void,
) {
  const retry = document.createElement("button");
  retry.id = "renderer-retry";
  retry.type = "button";
  retry.textContent = t("memory.retry");
  retry.hidden = true;
  document.querySelector("#status")!.after(retry);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let attempts = 0;
  let restoreFocus = false;
  function attempt() {
    // A later deliberate focus choice wins over the earlier Retry request.
    if (document.activeElement !== retry && document.activeElement !== document.body)
      restoreFocus = false;
    restoreFocus ||= document.activeElement === retry;
    timer = undefined;
    retry.hidden = true;
    try {
      rebuild();
      if (restoreFocus) canvas.focus({ preventScroll: true });
      restoreFocus = false;
    } catch (error) {
      failure(String(error));
      attempts++;
      if (attempts < 3) timer = setTimeout(attempt, attempts * 250);
      else {
        retry.hidden = false;
        if (restoreFocus) retry.focus();
      }
    }
  }
  canvas.addEventListener("webglcontextlost", () => {
    restoreFocus = false;
    clearTimeout(timer);
    timer = undefined;
    retry.hidden = true;
  });
  canvas.addEventListener("webglcontextrestored", () => {
    attempts = 0;
    attempt();
  });
  retry.addEventListener("click", () => {
    attempts = 0;
    attempt();
  });
}
