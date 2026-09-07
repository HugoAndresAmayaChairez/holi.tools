// Developer packaging only. The resulting executable needs neither Node nor WASM files.
import {
  cp,
  mkdir,
  readFile,
  writeFile,
  stat,
  access,
  chmod,
  readdir,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve, join, basename, relative, isAbsolute } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const manifest = await readFile(
  join(root, "local/mcp/native/Cargo.toml"),
  "utf8"
);
const version = manifest.match(/^version = "([^"]+)"/m)?.[1];
if (!version) throw new Error("Native package version missing");
const sha256 = (data) => createHash("sha256").update(data).digest("hex");
const compiler = spawnSync("rustc", ["-vV"], {
  encoding: "utf8",
  windowsHide: true,
});
const host = compiler.stdout?.match(/^host: (.+)$/m)?.[1];
if (compiler.status !== 0 || !host)
  throw new Error("Rust host target could not be identified");
const noticeCheck = process.argv.find(
  (argument) =>
    argument === "--check-notices" || argument.startsWith("--check-notices=")
);
const noticeTarget = noticeCheck?.includes("=")
  ? noticeCheck.split("=")[1]
  : host;
if (!/^[a-z0-9_.-]+$/.test(noticeTarget))
  throw new Error("Invalid notice-check target");
const licenses = await collectNotices(noticeTarget);
if (noticeCheck) {
  console.log(JSON.stringify(licenses.summary, null, 2));
  process.exit(0);
}
const executable = `holi-mcp${process.platform === "win32" ? ".exe" : ""}`;
const binary = resolve(
  process.env.HOLI_NATIVE_BINARY ?? join(root, "target/native", executable)
);
await access(binary);
const identify = spawnSync(binary, ["--version"], {
  encoding: "utf8",
  windowsHide: true,
});
if (identify.status !== 0 || identify.stdout.trim() !== version)
  throw new Error("Build the matching native executable before packaging");
const outputRoot = join(root, "dist/local");
await mkdir(outputRoot, { recursive: true });
const name = `holi-local-${version}-${process.platform}-${process.arch}`;
let output = join(outputRoot, name);
try {
  await access(output);
  output += `-${Date.now()}`;
} catch {
  /* New release folder. */
}
await mkdir(output);
await cp(binary, join(output, executable));
if (process.platform !== "win32") await chmod(join(output, executable), 0o755);
for (const file of ["README.md", "CHANGELOG.md", "fonts", "skills"])
  await cp(join(root, "local/mcp", file), join(output, file), {
    recursive: true,
  });
await cp(join(root, "local/mcp/LICENSE"), join(output, "LICENSE"));

await writeFile(join(output, "THIRD-PARTY-NOTICES.txt"), licenses.text);
await writeFile(
  join(output, "THIRD-PARTY-PROVENANCE.json"),
  JSON.stringify(licenses.provenance, null, 2) + "\n"
);

// Include the actual Rust build inputs, including uncommitted migration code.
// A source snapshot avoids incorrectly advertising the older git HEAD as source.
const source = join(output, "source");
await mkdir(source);
const excluded = new Set([
  "target",
  "node_modules",
  "pkg",
  "pkg-node",
  ".git",
  "dist",
  "test-output",
]);
for (const file of [
  "Cargo.toml",
  "Cargo.lock",
  "crates",
  "local/mcp/LICENSE",
  "local/mcp/native",
  "local/mcp/fonts",
  "local/mcp/skills",
  "local/mcp/README.md",
  "local/mcp/CHANGELOG.md",
  "packages/engines/typst/src/templates.v1.json",
  "scripts/package-local.mjs",
  "spec",
]) {
  await mkdir(resolve(source, file, ".."), { recursive: true });
  await cp(join(root, file), join(source, file), {
    recursive: true,
    filter: (path) =>
      !relative(root, path)
        .split(/[\\/]/)
        .some((part) => excluded.has(part)),
  });
}
await cp(join(root, "local/mcp/LICENSE"), join(source, "LICENSE"));
await writeFile(
  join(output, "SOURCE.md"),
  `# Corresponding source\n\nThe source/ folder contains the actual Rust build inputs used for this package, including local edits. Build with Rust 1.93+ using cargo build -p holi-mcp --profile native from source/.\n\nProject: https://github.com/HugoAndresAmayaChairez/holi.tools\nLicense: AGPL-3.0; see LICENSE. Bundled fonts have their own licenses in fonts/.\n`
);
const metadata = {
  name: "Holi Local",
  version,
  platform: process.platform,
  arch: process.arch,
  runtime: "rust-native",
  createdAt: new Date().toISOString(),
  executable,
  executableBytes: (await stat(binary)).size,
  executableSha256: sha256(await readFile(binary)),
  dependencyNotices: licenses.summary,
  published: false,
};
await writeFile(
  join(output, "manifest.json"),
  JSON.stringify(metadata, null, 2) + "\n"
);
const archive = `${output}.tar.gz`;
const pack = spawnSync(
  "tar",
  ["-czf", archive, "-C", outputRoot, basename(output)],
  { encoding: "utf8", windowsHide: true }
);
if (pack.status !== 0)
  throw new Error("Could not create release archive; install a tar command");
await writeFile(
  `${archive}.sha256`,
  `${sha256(await readFile(archive))}  ${basename(archive)}\n`
);
console.log(JSON.stringify({ folder: output, archive, ...metadata }, null, 2));

/** Package only the non-dev dependency graph reachable from holi-mcp on this host. */
async function collectNotices(target) {
  const cargo = spawnSync(
    "cargo",
    [
      "metadata",
      "--format-version",
      "1",
      "--filter-platform",
      target,
      "--locked",
      "--offline",
    ],
    {
      cwd: root,
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 64 * 1024 * 1024,
    }
  );
  if (cargo.status !== 0)
    throw new Error(
      "Cargo license metadata is unavailable; run cargo fetch --locked before packaging"
    );
  const metadata = JSON.parse(cargo.stdout);
  const packages = new Map(metadata.packages.map((item) => [item.id, item]));
  const nodes = new Map(metadata.resolve.nodes.map((item) => [item.id, item]));
  const entry = metadata.packages.find(
    (item) => item.name === "holi-mcp" && item.source === null
  );
  if (!entry)
    throw new Error("Native Cargo package is missing from dependency metadata");
  const selected = new Set();
  const pending = [entry.id];
  while (pending.length) {
    const id = pending.pop();
    if (selected.has(id)) continue;
    selected.add(id);
    for (const dependency of nodes.get(id).deps)
      if (dependency.dep_kinds.some((kind) => kind.kind !== "dev"))
        pending.push(dependency.pkg);
  }

  const noticeRoot = join(root, "local/mcp/native/notices");
  const supplements = new Map();
  for (const file of ["index.json", "extra-manifest.json"]) {
    const catalog = JSON.parse(await readFile(join(noticeRoot, file), "utf8"));
    for (const item of catalog.packages) {
      const key = `${item.name}@${item.version}`;
      if (supplements.has(key))
        throw new Error(`Duplicate supplemental notice: ${key}`);
      supplements.set(key, item);
    }
  }
  const lockedChecksums = new Map();
  const lock = await readFile(join(root, "Cargo.lock"), "utf8");
  for (const block of lock.split("[[package]]").slice(1)) {
    const field = (name) =>
      block.match(new RegExp(`^${name} = "([^"\\r\\n]+)"`, "m"))?.[1];
    lockedChecksums.set(
      `${field("name")}@${field("version")}`,
      field("checksum")
    );
  }

  const sections = [
    "# Rust dependency notices",
    `Non-development dependency graph reachable from holi-mcp for ${target}, including build dependencies. Versions and crate checksums are pinned in source/Cargo.lock.`,
    "Upstream texts omitted by published crates are supplemented from pinned revisions. Explicit canonical-text exceptions preserve the upstream declaration without inventing copyright notices. See THIRD-PARTY-PROVENANCE.json and source/local/mcp/native/notices/.",
  ];
  const records = [];
  const missing = [];
  let supplementalPackages = 0;
  const exceptions = [];
  for (const dependency of [...selected]
    .map((id) => packages.get(id))
    .sort((a, b) =>
      `${a.name}@${a.version}`.localeCompare(`${b.name}@${b.version}`)
    )) {
    const key = `${dependency.name}@${dependency.version}`;
    const folder = resolve(dependency.manifest_path, "..");
    const record = {
      name: dependency.name,
      version: dependency.version,
      license: dependency.license,
      source:
        dependency.repository ??
        dependency.source ??
        "included source snapshot",
      crateChecksum: lockedChecksums.get(key),
      files: [],
    };
    sections.push(
      `\n## ${dependency.name} ${dependency.version}\nLicense: ${dependency.license ?? "see included license text"}\nSource: ${record.source}`
    );
    const names = (await readdir(folder)).filter((name) =>
      /^(licen[sc]e|copying|copyright|notice)([._-]|$)/i.test(name)
    );
    if (dependency.license_file) names.push(dependency.license_file);
    for (const name of new Set(names)) {
      const path = containedPath(folder, name);
      if (!(await stat(path)).isFile()) continue;
      const data = await readFile(path);
      if (!data.toString("utf8").trim()) continue;
      const item = {
        path: name,
        sha256: sha256(data),
        origin: "published Cargo package",
      };
      record.files.push(item);
      sections.push(
        `\n${name}\nSHA-256: ${item.sha256}\n\n${data.toString("utf8")}`
      );
    }
    const supplement = supplements.get(key);
    if (supplement) {
      if (
        supplement.license !== dependency.license ||
        supplement.crateChecksum !== record.crateChecksum
      )
        throw new Error(
          `Supplemental notice no longer matches the locked crate: ${key}`
        );
      if (supplement.revision) {
        const vcs = JSON.parse(
          await readFile(join(folder, ".cargo_vcs_info.json"), "utf8")
        );
        if (vcs.git?.sha1 !== supplement.revision)
          throw new Error(`Supplemental notice revision mismatch: ${key}`);
        record.revision = supplement.revision;
      }
      if (supplement.exception) {
        record.exception = supplement.exception;
        exceptions.push(key);
        sections.push(`\nUpstream exception: ${supplement.exception}`);
      }
      if (!supplement.files?.length)
        throw new Error(`Supplemental notice has no text: ${key}`);
      for (const item of supplement.files) {
        const data = await readFile(containedPath(noticeRoot, item.path));
        if (!data.toString("utf8").trim() || sha256(data) !== item.sha256)
          throw new Error(
            `Supplemental notice integrity failure: ${key}/${item.path}`
          );
        record.files.push(item);
        sections.push(
          `\n${item.path}\nSource: ${item.url ?? item.origin}\nSHA-256: ${item.sha256}\n\n${data.toString("utf8")}`
        );
      }
      supplementalPackages++;
    }
    if (!record.files.length && !dependency.source) {
      const data = await readFile(join(root, "local/mcp/LICENSE"));
      record.files.push({
        path: "source/LICENSE",
        sha256: sha256(data),
        origin: "Holi project license",
      });
      sections.push(`\nHoli project license: see LICENSE and source/LICENSE.`);
    }
    if (!record.files.length) missing.push(key);
    records.push(record);
  }
  if (missing.length)
    throw new Error(
      `Required license text is missing for ${target}: ${missing.join(", ")}. Add pinned supplemental notices before packaging this platform.`
    );
  const summary = {
    target,
    packages: records.length,
    supplementalPackages,
    canonicalExceptions: exceptions,
  };
  return {
    summary,
    text: sections.join("\n") + "\n",
    provenance: { v: 1, ...summary, packages: records },
  };
}

function containedPath(folder, name) {
  const path = resolve(folder, name);
  const relativePath = relative(folder, path);
  if (
    !relativePath ||
    isAbsolute(relativePath) ||
    relativePath.split(/[\\/]/).includes("..")
  )
    throw new Error("Notice path must stay inside its source directory");
  return path;
}
