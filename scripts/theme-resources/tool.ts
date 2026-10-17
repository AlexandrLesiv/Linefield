import { spawnSync } from "node:child_process";

type Tool = "xml" | "android" | "fixture";
type Stage = "probe" | "compile" | "version";
export class ToolFailure extends Error {
  readonly diagnostic: {
    tool: Tool;
    stage: Stage;
    exit: number | null;
    signal: string | null;
    reason: string;
  };
  constructor(
    tool: Tool,
    stage: Stage,
    exit: number | null,
    signal: string | null,
    reason: string,
  ) {
    super("Native resource tool failed");
    this.diagnostic = { tool, stage, exit, signal, reason };
  }
}
export function invokeTool(
  executable: string,
  args: readonly string[],
  tool: Tool,
  stage: Stage,
): string | undefined {
  const result = spawnSync(executable, args, {
    encoding: "utf8",
    timeout: 30_000,
    maxBuffer: 128 * 1024,
  });
  const code = result.error && "code" in result.error ? result.error.code : undefined;
  if (stage === "probe" && code === "ENOENT") return undefined;
  if (result.error || result.status !== 0) {
    const reason =
      code === "ETIMEDOUT" ? "timeout" : result.error ? "execution-error" : "nonzero-exit";
    throw new ToolFailure(tool, stage, result.status, result.signal, reason);
  }
  return (result.stdout || result.stderr).trim();
}
