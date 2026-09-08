// Acceptance runs only in isolated homes; never edits the developer's client.
import assert from "node:assert/strict";
import {
  mkdir,
  mkdtemp,
  readFile,
  writeFile,
  readdir,
  access,
} from "node:fs/promises";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

if (!["win32", "linux"].includes(process.platform)) process.exit(0);
const root = resolve(import.meta.dirname, "..");
const version = (
  await readFile(join(root, "local/installer/Cargo.toml"), "utf8")
).match(/^version = "([^"]+)"/m)[1];
const setup = resolve(
  process.env.HOLI_SETUP_BINARY ??
    join(
      root,
      `dist/local/holi-local-setup-${version}-${process.platform}-${process.arch}${process.platform === "win32" ? ".exe" : ""}`
    )
);
const output = join(root, "local/mcp/test-output");
await mkdir(output, { recursive: true });
const test = await mkdtemp(join(output, "installer-"));
const home = join(test, "Usuario ñ");
await mkdir(home);
const env = {
  ...process.env,
  HOME: home,
  USERPROFILE: home,
  LOCALAPPDATA: join(home, "Local"),
  APPDATA: join(home, "Roaming"),
  PATH: "",
};
delete env.CLAUDE_CONFIG_DIR;
delete env.XDG_DATA_HOME;
function run(args, ok = true, changes = {}) {
  const result = spawnSync(setup, args, {
    env: { ...env, ...changes },
    encoding: "utf8",
    windowsHide: true,
    timeout: 120000,
  });
  if (ok)
    assert.equal(result.status, 0, result.stderr || result.error?.message);
  else assert.notEqual(result.status, 0, "Expected rejection");
  return result;
}
function record(result) {
  return JSON.parse(
    result.stdout.slice(
      result.stdout.indexOf("{"),
      result.stdout.lastIndexOf("}") + 1
    )
  );
}
const defaults = JSON.parse(run(["--print-defaults"]).stdout);
assert.equal(defaults.outputDirectory, join(home, "Holi/Output"));
await assert.rejects(access(defaults.installDirectory));
const original =
  '{ "preferences": {"untouched": true}, "mcpServers": {"other": {"command": "keep"}} }\r\n';
await writeFile(defaults.claudeCodeConfig, original);
const installed = record(run(["--yes", "--client", "claude-code"]));
assert.equal(installed.installDirectory, defaults.installDirectory);
assert.equal(installed.outputDirectory, defaults.outputDirectory);
assert.equal(installed.state, "installed");
assert.equal(await readFile(installed.backups[0], "utf8"), original);
const config = JSON.parse(await readFile(defaults.claudeCodeConfig, "utf8"));
assert.equal(config.preferences.untouched, true);
assert.equal(config.mcpServers.other.command, "keep");
assert.equal(config.mcpServers["holi-local"].command, installed.executable);
assert.deepEqual(config.mcpServers["holi-local"].args, [
  "--output",
  defaults.outputDirectory,
]);
await writeFile(
  join(installed.outputDirectory, "keep.txt"),
  "existing document"
);
const again = record(run(["--yes", "--client", "claude-code"]));
assert.equal(again.executable, installed.executable);
assert.deepEqual(again.backups, []);
assert.equal(
  await readFile(join(installed.outputDirectory, "keep.txt"), "utf8"),
  "existing document"
);
await access(join(defaults.claudeCodeSkills, "holi-documents/SKILL.md"));

const custom = join(test, "Mis programas ñ");
const customOut = join(test, "Mis documentos ñ");
const customConfig = join(test, "custom-client.json");
await writeFile(customConfig, "malformed");
const customArgs = [
  "--yes",
  "--client",
  "claude-code",
  "--client-config",
  customConfig,
  "--skills-dir",
  join(test, "custom-skills"),
  "--install-dir",
  custom,
  "--output-dir",
  customOut,
];
run(customArgs, false);
assert.equal(await readFile(customConfig, "utf8"), "malformed");
await writeFile(
  customConfig,
  JSON.stringify({ mcpServers: { "holi-local": { command: "other-install" } } })
);
run(customArgs, false);
const relocated = record(run([...customArgs, "--replace-client"]));
assert.equal(relocated.outputDirectory, customOut);
assert.equal(relocated.installDirectory, custom);
run(
  ["--yes", "--install-dir", custom, "--output-dir", join(custom, "nested")],
  false
);
const stranger = join(test, "unmanaged");
await mkdir(stranger);
await writeFile(join(stranger, "keep.txt"), "untouched");
run(["--yes", "--install-dir", stranger, "--output-dir", customOut], false);
assert.equal(await readFile(join(stranger, "keep.txt"), "utf8"), "untouched");

if (process.platform === "win32") {
  await mkdir(join(home, "Roaming/Claude"), { recursive: true });
  await writeFile(defaults.claudeDesktopConfig, original);
  run(["--yes", "--client", "claude-desktop"]);
  const desktop = JSON.parse(
    await readFile(defaults.claudeDesktopConfig, "utf8")
  );
  assert.equal(desktop.preferences.untouched, true);
  assert.equal(desktop.mcpServers["holi-local"].command, installed.executable);
} else {
  run(["--yes", "--client", "claude-desktop"], false);
  const xdg = JSON.parse(
    run(["--print-defaults"], true, { XDG_DATA_HOME: join(home, "xdg") }).stdout
  );
  assert.equal(xdg.installDirectory, join(home, "xdg/holi-local"));
}

// Exercise the executable named by the generated configuration, with PATH empty.
const require = createRequire(join(root, "local/mcp/package.json"));
const { Client } = await import(
  pathToFileURL(require.resolve("@modelcontextprotocol/sdk/client/index.js"))
);
const { StdioClientTransport } = await import(
  pathToFileURL(require.resolve("@modelcontextprotocol/sdk/client/stdio.js"))
);
const client = new Client({ name: "installer-acceptance", version: "1" });
const transport = new StdioClientTransport({
  command: installed.executable,
  args: ["--output", installed.outputDirectory],
  env,
  stderr: "pipe",
});
try {
  await client.connect(transport);
  const info = await client.callTool({ name: "holi_info", arguments: {} });
  assert.notEqual(info.isError, true);
  const data =
    info.structuredContent ??
    JSON.parse(info.content.find((c) => c.type === "text").text);
  assert.equal(data.version, version);
  assert.equal(data.outputFolder, installed.outputDirectory);
  const templates = await client.callTool({
    name: "document_templates",
    arguments: {},
  });
  assert.notEqual(templates.isError, true);
  const pdf = await client.callTool({
    name: "document_compile",
    arguments: {
      source: "= Instalación correcta\nEspañol y ñ.",
      filename: "installer-check.pdf",
    },
  });
  assert.notEqual(pdf.isError, true, JSON.stringify(pdf));
  const qr = await client.callTool({
    name: "qr_batch",
    arguments: {
      items: [
        { content: "https://holi.tools", filename: "installer-check.png" },
      ],
      format: "png",
    },
  });
  assert.notEqual(qr.isError, true, JSON.stringify(qr));
  await access(join(installed.outputDirectory, "installer-check.pdf"));
  await access(join(installed.outputDirectory, "installer-check.png"));
} finally {
  await client.close();
}
assert.equal(
  (await readdir(installed.installDirectory)).some(
    (name) => name.startsWith(".holi-stage") || name === ".install.lock"
  ),
  false
);
const evidence = {
  platform: process.platform,
  version,
  installer: setup,
  isolatedHome: home,
  defaultInstallation: installed,
  customInstallation: relocated,
  checks: [
    "defaults",
    "custom-unicode-paths",
    "config-preservation-backup",
    "reinstall",
    "malformed-json",
    "replace-guard",
    "unmanaged-folder",
    "output-preservation",
    "client-integration",
    "installed-MCP-PDF-QR-empty-PATH",
  ],
};
await writeFile(join(test, "evidence.json"), JSON.stringify(evidence, null, 2));
console.log(
  JSON.stringify(
    { passed: true, evidence: join(test, "evidence.json") },
    null,
    2
  )
);
