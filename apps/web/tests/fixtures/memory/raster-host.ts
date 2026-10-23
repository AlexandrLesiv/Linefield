import { bridge } from "../../../src/memory/bridge.ts";
import { edit } from "../../../src/memory/edit-bridge.ts";
import { queryReady } from "./query-readiness.ts";
import { closeTailFixture } from "./tail-fixture.ts";
import { farRaster, rasterCommand } from "./raster-bindings.ts";
export interface RasterToken {
  owner: bigint;
  session: bigint;
  interaction: bigint;
  mapping: bigint;
}
export function check(value: boolean, message: string, detail: unknown) {
  if (!value) throw Error(JSON.stringify({ message, detail }));
}
export function rasterFixture(backing: number, zoom = 1, angle = 0, far = false) {
  if (far) farRaster();
  let s = bridge.create();
  const width = backing === 4 ? 512 : 1024,
    height = backing === 4 ? 384 : 768;
  s = queryReady(bridge.metrics(bridge.enter(s.owner), 1n, width, height, backing));
  s = edit.view(s, zoom, width / 2, height / 2, false);
  s = edit.view(s, angle, width / 2, height / 2, true);
  let token: RasterToken | undefined;
  const authority = (override: Partial<RasterToken> = {}) => {
    if (!token) throw Error("missing accepted Begin token");
    return { ...token, ...override };
  };
  const accepted = (row: ReturnType<typeof rasterCommand>) => {
    check(row.code === "ok", "accepted shared pan command", row);
    return row;
  };
  const updateResult = (
    sequence: bigint,
    x: number,
    y = 0,
    override: Partial<RasterToken> = {},
  ) => {
    const t = authority(override);
    return rasterCommand("fixtureRasterUpdate", [
      t.owner,
      t.session,
      t.interaction,
      t.mapping,
      sequence,
      x,
      y,
    ]);
  };
  const terminalResult = (
    sequence: bigint,
    cancel = false,
    override: Partial<RasterToken> = {},
  ) => {
    const t = authority(override);
    return rasterCommand("fixtureRasterTerminal", [
      t.owner,
      t.session,
      t.interaction,
      t.mapping,
      sequence,
      cancel,
    ]);
  };
  return {
    begin(x = 0, y = 0) {
      const current = bridge.read(s.owner);
      const row = accepted(
        rasterCommand("fixtureRasterBegin", [s.owner, s.session, current.mapping, x, y]),
      );
      token = {
        owner: s.owner,
        session: s.session,
        interaction: BigInt(row.interaction),
        mapping: BigInt(row.mapping),
      };
      return row;
    },
    token: () => authority(),
    update: (sequence: bigint, x: number, y = 0) => accepted(updateResult(sequence, x, y)),
    updateResult,
    terminal: (sequence: bigint, cancel = false) => accepted(terminalResult(sequence, cancel)),
    terminalResult,
    view: () => bridge.mapping(s.owner, s.session),
    basis: () => {
      s = edit.view(bridge.read(s.owner), 0.25, width / 2, height / 2, true);
    },
    dispose: () => closeTailFixture(s),
  };
}
