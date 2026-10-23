import type { PreparedCache } from "../../../src/memory/prepared-cache.ts";
// Hold an actual generator result, after its real preparation has started. Later
// readers still run normally; only the painter-order head is delayed by the test.
export function coldReaders(cache: PreparedCache, fourth?: () => void) {
  const original = cache.reader.bind(cache);
  const entries: { stroke: string; chunk: string; ready: number; closed: boolean }[] = [];
  const pages = new Map<bigint, number>();
  let release = () => {},
    held = true,
    active = 0,
    peak = 0;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  cache.reader = (...args) => {
    const reader = original(...args),
      index = entries.length;
    const entry = { stroke: String(args[0]), chunk: String(args[4]), ready: 0, closed: false };
    entries.push(entry);
    return (async function* () {
      active++;
      peak = Math.max(peak, active);
      let first = true;
      try {
        for (;;) {
          const pending = reader.next();
          if (first && index === 3) fourth?.();
          first = false;
          const next = await pending;
          entry.ready++;
          if (!index && held) await gate;
          if (next.done) return;
          pages.set(next.value.page, index);
          yield next.value;
        }
      } finally {
        try {
          await reader.return(undefined);
        } finally {
          active--;
          entry.closed = true;
        }
      }
    })();
  };
  return {
    entries,
    pages,
    snapshot: () => ({
      started: entries.length,
      active,
      peak,
      readyLater: entries.slice(1).filter((e) => e.ready).length,
      closed: entries.filter((e) => e.closed).length,
    }),
    release: () => {
      held = false;
      release();
    },
    restore: () => {
      cache.reader = original;
    },
  };
}
