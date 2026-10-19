import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
const root = fileURLToPath(new URL("../../", import.meta.url));
const fixtures = process.argv.includes("--fixtures");
function run(cwd: string, args: string[]): void {
  const result = spawnSync(process.execPath, args, { cwd, stdio: "inherit", shell: false });
  if (result.error || result.status !== 0) process.exit(result.status ?? 1);
}
run(root, ["scripts/web-memory/build.ts", ...(fixtures ? ["--fixtures"] : [])]);
run(root, ["scripts/localization.ts"]);
run(root, ["node_modules/typescript/bin/tsc", "--noEmit", "-p", "apps/web/tsconfig.json"]);
const web = join(root, "apps/web");
run(web, ["node_modules/vite/bin/vite.js", "build", ...(fixtures ? ["--mode", "memory-e2e"] : [])]);
run(web, [
  "node_modules/@playwright/test/cli.js",
  "test",
  ...(fixtures ? ["--config", "playwright.memory.config.ts"] : []),
  ...process.argv.slice(2).filter((value) => value !== "--fixtures"),
]);
