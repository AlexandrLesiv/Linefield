import { spawn } from "node:child_process";
export type Outcome =
  | "passed"
  | "failed"
  | "cancelled"
  | "timed-out"
  | "spawn-failed"
  | "output-limit";
export interface Execution {
  outcome: Outcome;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdoutBytes: number;
  stderrBytes: number;
}
export interface ProcessOptions {
  executable: string;
  arguments: readonly string[];
  cwd: string;
  signal: AbortSignal;
  timeoutMs?: number;
  graceMs?: number;
  outputLimit?: number;
}
export function childEnvironment(source: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = { NO_COLOR: "1" };
  for (const key of ["PATH", "HOME", "TMPDIR", "TMP", "TEMP", "SystemRoot", "LANG", "LC_ALL"])
    if (source[key] !== undefined) environment[key] = source[key];
  return environment;
}
export async function execute(options: ProcessOptions): Promise<Execution> {
  if (options.signal.aborted)
    return { outcome: "cancelled", exitCode: null, signal: null, stdoutBytes: 0, stderrBytes: 0 };
  return new Promise((resolve) => {
    let cause: Outcome | null = null;
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let grace: ReturnType<typeof setTimeout> | undefined;
    const child = spawn(options.executable, [...options.arguments], {
      cwd: options.cwd,
      env: childEnvironment(process.env),
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stop = (outcome: Outcome) => {
      if (cause !== null) return;
      cause = outcome;
      child.kill("SIGTERM");
      grace = setTimeout(() => {
        child.kill("SIGKILL");
      }, options.graceMs ?? 1000);
    };
    const abort = () => stop("cancelled");
    const timeout = setTimeout(() => stop("timed-out"), options.timeoutMs ?? 120_000);
    options.signal.addEventListener("abort", abort, { once: true });
    if (options.signal.aborted) abort();
    const checkOutput = () => {
      if (stdoutBytes + stderrBytes > (options.outputLimit ?? 1_048_576)) stop("output-limit");
    };
    child.stdout.on("data", (chunk: Buffer) => {
      stdoutBytes += chunk.length;
      checkOutput();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderrBytes += chunk.length;
      checkOutput();
    });
    child.on("error", () => {
      cause ??= "spawn-failed";
    });
    child.on("close", (exitCode, signal) => {
      clearTimeout(timeout);
      clearTimeout(grace);
      options.signal.removeEventListener("abort", abort);
      resolve({
        outcome: cause ?? (exitCode === 0 ? "passed" : "failed"),
        exitCode,
        signal,
        stdoutBytes,
        stderrBytes,
      });
    });
  });
}
