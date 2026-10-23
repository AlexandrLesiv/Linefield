import { PreparedCache } from "../../../src/memory/prepared-cache.ts";
import { GpuRenderer } from "../../../src/memory/gpu-renderer.ts";
import { gpuAdmission } from "../../../src/memory/gpu-retirement.ts";
import { preparation } from "../../../src/memory/preparation-bridge.ts";
import { editorHealthy } from "../../../src/memory/editor-health.ts";
import { assertions, closeTailFixture } from "./tail-fixture.ts";
import { querySource } from "./query-fixture.ts";

export async function retentionRelease(
  canvas: HTMLCanvasElement,
  kind: "page" | "ticket" | "code",
) {
  const { check, report } = assertions();
  const source = querySource(check, kind !== "page");
  check(preparation.release(source.state, source.input.token) === "ok", "setup ticket released");
  const cache = new PreparedCache(() => source.state);
  const renderer = new GpuRenderer(canvas, 1024, 768);
  const reader = cache.reader(source.stroke, 2n, kind === "page" ? 1 : 2, source.frame, 0n);
  const release = preparation.release;
  try {
    const first = await reader.next();
    check(!first.done && !!first.value, "real worker page adopted");
    if (!first.value) throw Error("missing adopted page");
    const borrowed = cache.borrow(first.value);
    check(cache.resources().tickets === (kind === "page" ? 0 : 1), "pending clipped charge");
    let rejected = false;
    if (kind === "page") {
      await reader.return(undefined);
      check(cache.resources().bytes > 0, "retired actual page remains borrowed");
      document.documentElement.dataset.trapStage = "release-page";
      try {
        borrowed.release();
      } catch {
        rejected = true;
      }
    } else {
      if (kind === "code") preparation.release = () => "invalid";
      else document.documentElement.dataset.trapStage = "release-ticket";
      try {
        await reader.return(undefined);
      } catch {
        rejected = true;
      }
      borrowed.release();
    }
    check(rejected, "release rejection propagated");
    const resources = cache.resources();
    check(resources.bytes === 0, "host payload ownership drained");
    check(
      kind === "page" ? resources.uncertainDescriptors === 1 : resources.uncertainTickets === 1,
      "uncertain canonical ownership remains separately charged",
    );
    borrowed.release();
    await reader.return(undefined);
    check(
      cache.resources().pages === resources.pages &&
        cache.resources().tickets === resources.tickets,
      "second release is idempotent",
    );
    renderer.dispose({
      resources: () => cache.resources(),
      cleanup: async () => {
        cache.dispose();
      },
    });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    let denied = false;
    try {
      gpuAdmission();
    } catch {
      denied = true;
    }
    check(denied, "uncertain owner fences successor admission");
    if (kind !== "code") {
      check(!editorHealthy(), "actual generated boundary poisoned");
      check(document.documentElement.dataset.afterTrap === "0", "no export after fatal release");
    }
    return { ...report(), resources, scope: "real worker/adoption release fault boundary" };
  } finally {
    preparation.release = release;
    cache.dispose();
    if (editorHealthy()) closeTailFixture(source.state);
  }
}
