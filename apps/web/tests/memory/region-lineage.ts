export type RegionRow = Readonly<Record<string, string | number | boolean>>;
const same = (a: RegionRow, b: RegionRow, keys: readonly string[]) =>
  keys.every((key) => a[key] !== undefined && b[key] !== undefined && a[key] === b[key]);
const timed = (row: RegionRow) => typeof row.time === "number" && Number.isFinite(row.time);
const identity = ["owner", "session", "epoch"];
/** Unknown, ambiguous, stale, cyclic or over-bound paths never earn attribution. */
export function regionLineage(rows: readonly RegionRow[], target: RegionRow | undefined) {
  if (!target) return;
  for (const ready of rows) {
    if (ready.kind !== "coverage-transition" || ready.phase !== "pan-ready" || !timed(ready))
      continue;
    const origins = rows.filter(
      (r) =>
        r.kind === "coverage-transition" &&
        r.phase === "pan-ready" &&
        r.receipt === ready.receipt &&
        same(r, ready, identity),
    );
    if (origins.length !== 1) continue;
    let receipt = ready.receipt,
      time = Number(ready.time),
      index = rows.indexOf(ready);
    const visited = new Set<string>();
    const chain: RegionRow[] = [];
    for (let depth = 0; depth < 16 && typeof receipt === "string"; depth++) {
      if (visited.has(receipt) || !Number.isFinite(time)) break;
      visited.add(receipt);
      const incoming = rows.filter(
        (r) =>
          r.kind === "coverage-transition" &&
          r.phase === "pan-recapture" &&
          r.receipt === receipt &&
          same(r, ready, identity),
      );
      if (
        incoming.length !== Number(chain.length > 0) ||
        (chain.length > 0 && incoming[0] !== chain.at(-1))
      )
        break;
      if (
        chain.length &&
        rows.some(
          (r) =>
            r.kind === "coverage-transition" &&
            r.phase === "pan-ready" &&
            r.receipt === receipt &&
            same(r, ready, identity),
        )
      )
        break;
      const publications = rows.filter(
        (r) => r.kind === "receipt-publish" && r.receipt === receipt && same(r, ready, identity),
      );
      const edges = rows.filter(
        (r) =>
          r.kind === "coverage-transition" &&
          r.phase === "pan-recapture" &&
          r.fromReceipt === receipt &&
          same(r, ready, identity),
      );
      if (publications.length > 1 || edges.length > 1 || (publications.length && edges.length))
        break;
      const publish = publications[0];
      if (publish) {
        if (!timed(publish) || !(Number(publish.time) >= time) || rows.indexOf(publish) <= index)
          break;
        const ack = rows.find(
          (r) =>
            r.kind === "receipt-ack" &&
            timed(r) &&
            r.outcome === "ok" &&
            r.receipt === receipt &&
            same(r, ready, identity) &&
            rows.indexOf(r) > rows.indexOf(publish) &&
            Number(r.time) >= Number(publish.time) &&
            same(r, target, ["owner", "session", "content", "mapping"]) &&
            same(r, publish, ["content", "mapping"]),
        );
        if (
          ack &&
          !rows
            .slice(rows.indexOf(ready), rows.indexOf(ack) + 1)
            .some(
              (r) =>
                typeof r.receipt === "string" &&
                visited.has(r.receipt) &&
                (r.kind === "receipt-cancel" ||
                  (r.kind === "frame-retired" && r.cancelled === true)),
            )
        )
          return { ready, chain, publish, ack };
        break;
      }
      const edge = edges[0];
      if (
        !edge ||
        !timed(edge) ||
        !(Number(edge.time) >= time) ||
        rows.indexOf(edge) <= index ||
        edge.content !== ready.content
      )
        break;
      chain.push(edge);
      receipt = edge.receipt;
      time = Number(edge.time);
      index = rows.indexOf(edge);
    }
  }
}
