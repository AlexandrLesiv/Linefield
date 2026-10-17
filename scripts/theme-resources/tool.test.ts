import assert from "node:assert/strict";
import test from "node:test";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { invokeTool, ToolFailure } from "./tool.ts";

test("THEME-13 only missing executables qualify as unavailable", () => {
  assert.equal(
    invokeTool(join(tmpdir(), "linefield-nonexistent-tool-7bd0514"), [], "fixture", "probe"),
    undefined,
  );
  assert.equal(
    invokeTool(process.execPath, ["-e", "process.stdout.write('ready')"], "fixture", "probe"),
    "ready",
  );
  for (const stage of ["probe", "compile"] as const) {
    assert.throws(
      () =>
        invokeTool(
          process.execPath,
          ["-e", "process.stderr.write('private fixture');process.exit(7)"],
          "fixture",
          stage,
        ),
      (error: unknown) => {
        assert.ok(error instanceof ToolFailure);
        assert.deepEqual(error.diagnostic, {
          tool: "fixture",
          stage,
          exit: 7,
          signal: null,
          reason: "nonzero-exit",
        });
        assert.ok(!JSON.stringify(error).includes("private fixture"));
        return true;
      },
    );
  }
});
