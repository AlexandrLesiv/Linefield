import { invokeTool, ToolFailure } from "./tool.ts";
import { access, mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { resolved } from "../../shared/theme/resolve.ts";
import { generateThemeResources } from "./generate.ts";

function report(check: string, status: "passed" | "not-run", detail: string): void {
  console.log(
    JSON.stringify({
      check,
      status,
      detail,
      scope: "resource syntax/compilation; not application linking or runtime",
    }),
  );
}
async function androidTool(): Promise<string | undefined> {
  const executable = process.platform === "win32" ? "aapt2.exe" : "aapt2";
  if (invokeTool(executable, ["version"], "android", "probe") !== undefined) return executable;
  const roots = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    join(homedir(), "Library/Android/sdk"),
    join(homedir(), "Android/Sdk"),
    ...(process.env.LOCALAPPDATA ? [join(process.env.LOCALAPPDATA, "Android/Sdk")] : []),
  ];
  for (const root of roots) {
    if (!root) continue;
    const directory = join(root, "build-tools");
    const versions = await readdir(directory).catch((error: unknown) => {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") return [];
      throw error;
    });
    versions.sort((left, right) => right.localeCompare(left, "en", { numeric: true }));
    for (const version of versions) {
      const candidate = join(directory, version, executable);
      if (
        await access(candidate).then(
          () => true,
          (error: unknown) => {
            if (error instanceof Error && "code" in error && error.code === "ENOENT") return false;
            throw new ToolFailure("android", "probe", null, null, "sdk-access-error");
          },
        )
      )
        return candidate;
    }
  }
  return undefined;
}
const directory = await mkdtemp(join(tmpdir(), "linefield-native-theme-"));
try {
  const outputs = generateThemeResources(resolved);
  for (const [path, content] of Object.entries(outputs)) {
    const destination = join(directory, path);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, content);
  }
  if (invokeTool("xmllint", ["--version"], "xml", "probe") === undefined) {
    report("theme-xml", "not-run", "xmllint unavailable");
  } else {
    const paths = Object.keys(outputs).filter((path) => /\.(xml|xaml)$/.test(path));
    invokeTool(
      "xmllint",
      ["--noout", ...paths.map((path) => join(directory, path))],
      "xml",
      "compile",
    );
    report("theme-xml", "passed", `${paths.length} Android XML/WinUI XAML files parsed`);
  }
  const aapt2 = await androidTool();
  if (aapt2) {
    const version = invokeTool(aapt2, ["version"], "android", "version") ?? "";
    invokeTool(
      aapt2,
      ["compile", "--dir", join(directory, "android"), "-o", join(directory, "colors.zip")],
      "android",
      "compile",
    );
    report(
      "theme-android",
      "passed",
      version.match(/Android Asset Packaging Tool \(aapt\) [\d.-]+/)?.[0] ??
        "aapt2 compile succeeded",
    );
  } else report("theme-android", "not-run", "aapt2 unavailable");
  report("theme-apple", "not-run", "asset compilation is not included in this portable check");
  report("theme-winui", "not-run", "WinUI resource compiler/application consumer not configured");
  report("theme-gtk", "not-run", "GTK CSS runtime consumer not configured");
} catch (error: unknown) {
  console.error(
    JSON.stringify({
      check: "theme-native",
      status: "failed",
      reason: "resource validation failed",
      ...(error instanceof ToolFailure ? error.diagnostic : {}),
    }),
  );
  process.exitCode = 1;
} finally {
  await rm(directory, { recursive: true, force: true });
}
