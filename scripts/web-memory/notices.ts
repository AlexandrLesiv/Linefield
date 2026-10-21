import { readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
interface Package {
  name: string;
  version: string;
  source: string | null;
  manifest_path: string;
  license: string | null;
}
export async function writeNotices(
  root: string,
  output: string,
  metadataJson: string,
  legacyFixture = false,
): Promise<void> {
  const metadata: { packages: Package[] } = JSON.parse(metadataJson);
  const sections = [
    "Linefield runtime dependency notices. This file does not select a license for Linefield authored code.",
  ];
  if (legacyFixture)
    sections.push(
      "canvaskit-wasm 0.41.1\n" +
        (await readFile(join(root, "apps/web/node_modules/canvaskit-wasm/LICENSE"), "utf8")),
    );
  for (const dependency of metadata.packages.filter((item) => item.source !== null)) {
    const directory = dirname(dependency.manifest_path);
    const names = (await readdir(directory)).filter((name) => /^LICENSE(?:[.-]|$)/i.test(name));
    const licenses = await Promise.all(
      names.map((name) => readFile(join(directory, name), "utf8")),
    );
    sections.push(
      `${dependency.name} ${dependency.version} (${dependency.license ?? "See upstream license"})\n${licenses.join("\n")}`,
    );
  }
  await writeFile(join(output, "THIRD-PARTY-NOTICES.txt"), sections.join("\n\n---\n\n") + "\n");
}
