import { cleanupAsync } from "./cleanup-failure.ts";
import type { FrameCommand, FrameCommands } from "./frame-commands.ts";
import type { GpuRenderer } from "./gpu-renderer.ts";
/** Attempt every release and GPU drain, even if a preceding owner rejects cleanup. */
export function cleanupFrame(
  pending: FrameCommand | undefined,
  commands: FrameCommands | undefined,
  renderer: GpuRenderer,
  serial: number,
  validated: boolean,
  uncertain: () => void,
) {
  return cleanupAsync(async () => {
    let failure: unknown;
    try {
      if (pending?.kind === "page") pending.page.release?.();
    } catch (error) {
      failure = error;
    }
    try {
      commands?.stop();
      await commands?.dispose();
    } catch (error) {
      failure ??= error;
    }
    try {
      if (serial && !validated) await renderer.validated(serial);
    } catch (error) {
      uncertain();
      failure ??= error;
    }
    if (failure) throw failure;
  });
}
