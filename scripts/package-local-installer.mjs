// Build a self-contained setup executable from an already packaged distribution.
import {
  readFile,
  readdir,
  copyFile,
  writeFile,
  chmod,
  stat,
} from "node:fs/promises";
import { resolve, basename, join } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

if (!["win32", "linux"].includes(process.platform)) {
  console.log(
    "Self-contained installers target Windows and Ubuntu; portable archive retained."
  );
  process.exit(0);
}
const root = resolve(import.meta.dirname, "..");
const version = (
  await readFile(join(root, "local/installer/Cargo.toml"), "utf8")
).match(/^version = "([^"]+)"/m)[1];
const suffix = process.platform === "win32" ? ".exe" : "";
const stem = `holi-local-${version}-${process.platform}-${process.arch}`;
const folder = join(root, "dist/local");
const archives = await Promise.all((await readdir(folder))
  .filter((name) => name.startsWith(stem) && name.endsWith(".tar.gz"))
  .map(async (name) => ({ name, modified: (await stat(join(folder, name))).mtimeMs })));
archives.sort((a, b) => a.modified - b.modified);
const bundle = resolve(
  process.argv[2] ?? join(folder, archives.at(-1)?.name ?? "missing")
);
const bytes = await readFile(bundle);
const digest = createHash("sha256").update(bytes).digest("hex");
if (!(await readFile(`${bundle}.sha256`, "utf8")).startsWith(`${digest}  `))
  throw new Error("Bundle checksum mismatch");
const build = spawnSync(
  "cargo",
  ["build", "-p", "holi-local-setup", "--profile", "native", "--locked"],
  {
    cwd: root,
    env: { ...process.env, HOLI_INSTALL_BUNDLE: bundle },
    stdio: "inherit",
    windowsHide: true,
  }
);
if (build.status !== 0) process.exit(build.status ?? 1);
const output = join(
  folder,
  `holi-local-setup-${version}-${process.platform}-${process.arch}${suffix}`
);
await copyFile(join(root, `target/native/holi-local-setup${suffix}`), output);
if (process.platform !== "win32") await chmod(output, 0o755);
const setup = await readFile(output);
const sha256 = createHash("sha256").update(setup).digest("hex");
await writeFile(`${output}.sha256`, `${sha256}  ${basename(output)}\n`);
console.log(
  JSON.stringify(
    {
      installer: output,
      bytes: setup.length,
      sha256,
      bundle,
      published: false,
    },
    null,
    2
  )
);
