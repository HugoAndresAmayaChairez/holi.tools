import { expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

const entrypoint = fileURLToPath(new URL("../dist/main.js", import.meta.url));
const privateValue = `HOLI_PRIVATE_${randomUUID().replaceAll("-", "")}`;
const missing = join(tmpdir(), privateValue);

it.each([
  { args: [], reason: "An output folder is required" },
  { args: [privateValue], reason: "Positional arguments are not supported" },
  { args: [`--${privateValue}`], reason: "Unknown option" },
  { args: ["--output"], reason: "missing or invalid value" },
  { args: ["--output", missing], reason: "does not exist" },
  {
    args: ["--output", tmpdir(), "--transport", privateValue],
    reason: "Invalid transport",
  },
  {
    args: ["--output", tmpdir(), "--transport", "http", "--port", privateValue],
    reason: "Invalid port",
  },
  {
    args: ["--output", tmpdir(), "--transport", "http"],
    reason: "HOLI_MCP_TOKEN must contain",
  },
])("reports a useful private startup error: $reason", ({ args, reason }) => {
  const result = spawnSync(process.execPath, [entrypoint, ...args], {
    encoding: "utf8",
    timeout: 10_000,
    env: { ...process.env, HOLI_MCP_TOKEN: "short-secret" },
  });
  expect(result.error).toBeUndefined();
  expect(result.status).toBe(1);
  expect(result.stdout).toBe("");
  expect(result.stderr).toContain(reason);
  expect(result.stderr).not.toContain(privateValue);
  expect(result.stderr).not.toContain("short-secret");
  expect(result.stderr).not.toContain(tmpdir());
});
