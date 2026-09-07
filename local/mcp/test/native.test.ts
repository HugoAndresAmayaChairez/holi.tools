import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  access,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import {
  execFile,
  spawn,
  spawnSync,
  type ChildProcess,
} from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { request } from "node:http";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { basename, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { defaultStyle } from "@holi/engine-qr";

// Node and WASM here are independent clients/test oracles, never server runtimes.
// Build first with cargo build -p holi-mcp, or select a release artifact with
// HOLI_NATIVE_BINARY=/absolute/path/to/holi-mcp[.exe]. A missing binary fails the gate.
const binary = resolve(
  process.env.HOLI_NATIVE_BINARY ??
    fileURLToPath(
      new URL(
        `../../../target/debug/holi-mcp${process.platform === "win32" ? ".exe" : ""}`,
        import.meta.url
      )
    )
);
const delay = (ms: number) => new Promise((done) => setTimeout(done, ms));
const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
// A finite but deliberately expensive workload avoids Typst's explicit
// infinite-while-loop rejection and reaches the external cancellation bound.
const expensiveSource =
  "#let count = 0\n#for a in range(100000) { for b in range(100000) { count += a + b } }\n#count";
let root: string;
let client: Client;
let stderr = "";
const transports = new WeakMap<Client, StdioClientTransport>();
const runFile = promisify(execFile);

async function connect(
  output: string,
  options: {
    executable?: string;
    cwd?: string;
    env?: Record<string, string>;
  } = {}
) {
  const connection = new Client({
    name: "holi-native-acceptance",
    version: "1.0.0",
  });
  const transport = new StdioClientTransport({
    command: options.executable ?? binary,
    args: ["--output", output],
    stderr: "pipe",
    cwd: options.cwd,
    env: options.env,
  });
  transport.stderr?.on("data", (chunk) => {
    stderr += chunk.toString();
  });
  try {
    await connection.connect(transport);
    transports.set(connection, transport);
    return connection;
  } catch (error) {
    await transport.close();
    throw error;
  }
}

async function call(
  name: string,
  args: Record<string, unknown> = {},
  connection = client,
  timeout = 90_000
) {
  const response = await connection.callTool(
    { name, arguments: args },
    undefined,
    {
      timeout,
    }
  );
  const result = response.structuredContent as any;
  expect(result, `Missing structured result for ${name}`).toMatchObject({
    v: 1,
    ok: expect.any(Boolean),
    diagnostics: expect.any(Array),
  });
  if (!result.ok) expect(response.isError).toBe(true);
  return result;
}

async function artifact(value: any, mimeType: string) {
  expect(value).toMatchObject({
    path: expect.any(String),
    uri: expect.stringMatching(/^file:/),
    mimeType,
    bytes: expect.any(Number),
    sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
  });
  expect(fileURLToPath(value.uri)).toBe(value.path);
  expect(resolve(value.path)).toBe(
    join(await realpath(root), basename(value.path))
  );
  const bytes = await readFile(value.path);
  expect(bytes.length).toBe(value.bytes);
  expect(sha256(bytes)).toBe(value.sha256);
  if (mimeType === "application/pdf") {
    expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(2000);
  }
  return bytes;
}

beforeAll(async () => {
  await access(binary);
  root = await mkdtemp(join(tmpdir(), "holi-native-test-"));
  client = await connect(root);
}, 30_000);

afterAll(async () => {
  await client?.close();
  if (!root) return;
  const directory = resolve(root);
  if (
    !directory.startsWith(resolve(tmpdir()) + sep) ||
    !basename(directory).startsWith("holi-native-test-")
  )
    throw new Error("Invalid native test cleanup root");
  await rm(directory, { recursive: true, force: true });
});

describe("native executable over real stdio MCP", () => {
  it("discovers all tools and bundled resources, with offline defaults and advertised bounds", async () => {
    const tools = (await client.listTools()).tools;
    expect(tools.map((tool) => tool.name).sort()).toEqual([
      "document_compile",
      "document_render",
      "document_templates",
      "holi_info",
      "qr_batch",
    ]);
    const info = await call("holi_info");
    expect(info).toMatchObject({
      version: "0.2.0",
      packageDownloads: false,
      outputFolder: await realpath(root),
      limits: {
        sourceBytes: 1_048_576,
        totalInputBytes: 8_388_608,
        files: 100,
        batch: 100,
        pngSize: [128, 4096],
        jobSeconds: 60,
        queue: 8,
        workerMemoryBytes: (process.platform === "win32" ? 1 : 2) * 1024 ** 3,
        workerMemoryKind:
          process.platform === "win32"
            ? "committed"
            : process.platform === "darwin"
              ? "address-space-growth"
              : "address-space",
      },
    });
    expect(info.privacy).toMatch(/provider/i);
    expect(info.shadowLog).toBe(
      await readFile(new URL("../CHANGELOG.md", import.meta.url), "utf8")
    );
    const resources = (await client.listResources()).resources;
    expect(resources.map((resource) => resource.uri).sort()).toEqual([
      "holi://privacy",
      "holi://shadow-log",
      "holi://skills/holi-documents",
      "holi://skills/holi-qr-batch",
    ]);
    for (const resource of resources) {
      const response = await client.readResource({ uri: resource.uri });
      expect(response.contents[0]).toMatchObject({
        uri: resource.uri,
        text: expect.any(String),
      });
      expect(
        (response.contents[0] as { text: string }).text.length
      ).toBeGreaterThan(100);
      const text = (response.contents[0] as { text: string }).text;
      if (resource.uri === "holi://privacy") expect(text).toBe(info.privacy);
      if (resource.uri === "holi://shadow-log")
        expect(text).toBe(info.shadowLog);
      if (resource.uri.startsWith("holi://skills/")) {
        const name = resource.uri.slice("holi://skills/".length);
        expect(text).toBe(
          await readFile(
            new URL(`../skills/${name}/SKILL.md`, import.meta.url),
            "utf8"
          )
        );
      }
    }
  });

  it("renders both advertised templates with actual bundled fonts and literal Unicode data", async () => {
    const templates = (await call("document_templates")).templates;
    expect(templates.map((template: any) => template.id).sort()).toEqual([
      "letter",
      "report",
    ]);
    for (const template of templates) {
      expect(template).toMatchObject({
        v: 1,
        entrypoint: "main.typ",
        source: expect.any(String),
        dataSchema: { type: "object", additionalProperties: false },
      });
      const rendered = await call("document_render", {
        template: template.id,
        data: template.example,
        filename: `template-${template.id}.pdf`,
      });
      expect(rendered, JSON.stringify(rendered)).toMatchObject({ ok: true });
      await artifact(rendered.artifact, "application/pdf");
    }
    const literal = await call("document_render", {
      template: "report",
      data: {
        title: 'Título #panic("not executable")',
        sections: [
          {
            heading: "Español ñ ü",
            body: '«Acentos» \\ {} $x^2$ #read("host-secret.txt")',
          },
        ],
      },
      filename: "literal-data.pdf",
    });
    expect(literal, JSON.stringify(literal)).toMatchObject({ ok: true });
    await artifact(literal.artifact, "application/pdf");
    for (const data of [
      { title: 7, sections: [] },
      {
        title: "Invalid",
        sections: [{ heading: "A", body: "B" }],
        unknown: true,
      },
      { title: "Invalid", sections: [{ heading: "A" }] },
    ]) {
      expect(
        await call("document_render", {
          template: "report",
          data,
          filename: "invalid-template.pdf",
        })
      ).toMatchObject({
        ok: false,
        diagnostics: [{ code: "INVALID_TEMPLATE_DATA" }],
      });
    }
  }, 120_000);

  it("runs a copied executable with no repository assets or executable search path", async () => {
    const directory = join(root, "portable-executable");
    await mkdir(directory);
    const executable = join(directory, basename(binary));
    await copyFile(binary, executable);
    const portable = await connect(root, {
      executable,
      cwd: directory,
      env: { PATH: "" },
    });
    try {
      const templates = (await call("document_templates", {}, portable))
        .templates;
      const rendered = await call(
        "document_render",
        {
          template: templates[0].id,
          data: templates[0].example,
          filename: "portable.pdf",
        },
        portable
      );
      expect(rendered, JSON.stringify(rendered)).toMatchObject({ ok: true });
      await artifact(rendered.artifact, "application/pdf");
      const batch = await call(
        "qr_batch",
        {
          size: 256,
          items: [
            { content: "Portable native Holi", filename: "portable.png" },
          ],
        },
        portable
      );
      expect(batch).toMatchObject({
        ok: true,
        items: [{ ok: true, verified: true }],
      });
      const bytes = await artifact(batch.items[0].artifact, "image/png");
      const oracle = createRequire(import.meta.url)("@holi/wasm-qr/node");
      expect(oracle.decode_qr_image(bytes)).toBe("Portable native Holi");
      expect(await readdir(directory)).toEqual([basename(binary)]);
    } finally {
      await portable.close();
    }
  }, 90_000);

  it("rejects malformed tool arguments at the MCP schema boundary", async () => {
    const invalidCalls: Array<[string, Record<string, unknown>]> = [
      ["document_compile", { source: 7, filename: "schema.pdf" }],
      [
        "document_compile",
        { source: "Hello", filename: "schema.pdf", unknown: true },
      ],
      [
        "document_compile",
        {
          source: "Hello",
          filename: "schema.pdf",
          files: [{ path: "part.typ", content: "A", kind: "executable" }],
        },
      ],
      [
        "document_render",
        { template: "report", data: "not an object", filename: "schema.pdf" },
      ],
      [
        "document_render",
        { template: "report", data: {}, filename: "schema.pdf", unknown: true },
      ],
      ["qr_batch", { items: [] }],
      ["qr_batch", { items: [{ content: "", filename: "schema.png" }] }],
      [
        "qr_batch",
        { items: [{ content: "A", filename: "schema.png", unknown: true }] },
      ],
      [
        "qr_batch",
        { items: [{ content: "A", filename: "schema.png" }], verify: "true" },
      ],
      [
        "qr_batch",
        { items: [{ content: "A", filename: "schema.png" }], size: 128.5 },
      ],
      [
        "qr_batch",
        { items: [{ content: "A", filename: "schema.png" }], size: 4097 },
      ],
      ["unknown_holi_tool", {}],
    ];
    for (const [name, args] of invalidCalls) {
      await expect(
        client.callTool({ name, arguments: args })
      ).rejects.toMatchObject({ code: -32602 });
    }
    expect(await readdir(root)).not.toContain("schema.pdf");
    expect(await readdir(root)).not.toContain("schema.png");
    expect(await call("holi_info")).toMatchObject({ ok: true });
  });

  it("reports source locations and keeps virtual files isolated between disposable jobs", async () => {
    const broken = await call("document_compile", {
      source: "#variable_inexistente_holi",
      filename: "compile-error.pdf",
    });
    expect(broken).toMatchObject({
      ok: false,
      diagnostics: [
        {
          severity: "error",
          path: "main.typ",
          start: { line: 1, column: 2 },
        },
      ],
    });
    expect(broken.diagnostics[0].message).toContain(
      "variable_inexistente_holi"
    );
    expect(await readdir(root)).not.toContain("compile-error.pdf");
    const valid = await call("document_compile", {
      source:
        '#set page(paper: "a4")\n= Documento nativo\n#include "parts/section.typ"',
      files: [
        {
          path: "parts/section.typ",
          kind: "typst",
          content: "== Español\nContenido con ñ y ü.",
        },
      ],
      filename: "virtual-files.pdf",
    });
    expect(valid, JSON.stringify(valid)).toMatchObject({ ok: true });
    await artifact(valid.artifact, "application/pdf");
    const missing = await call("document_compile", {
      source: '#include "parts/section.typ"',
      filename: "no-leak.pdf",
    });
    expect(missing.ok).toBe(false);
    const recovered = await call("document_compile", {
      source: "= Recovery\nA fresh native compiler succeeds.",
      filename: "recovered.pdf",
    });
    expect(recovered, JSON.stringify(recovered)).toMatchObject({ ok: true });
    await artifact(recovered.artifact, "application/pdf");
  }, 120_000);

  it("denies host reads, package requests by default, traversal and invalid virtual data", async () => {
    const secret = `PRIVATE_NATIVE_${randomUUID()}`;
    const hostFile = join(root, "host-secret.txt");
    await writeFile(hostFile, secret);
    for (const requested of [
      "host-secret.txt",
      hostFile.replaceAll("\\", "/"),
    ]) {
      const denied = await call("document_compile", {
        source: `#read(${JSON.stringify(requested)})`,
        filename: "host-read.pdf",
      });
      expect(denied.ok).toBe(false);
      expect(JSON.stringify(denied)).not.toContain(secret);
    }
    const packages = await call("document_compile", {
      source: '#import "@preview/cetz:0.3.4"',
      filename: "packages-disabled.pdf",
    });
    expect(packages.ok).toBe(false);
    expect(JSON.stringify(packages.diagnostics)).toMatch(/disabled/i);
    for (const extra of [
      { mainPath: "../main.typ" },
      { files: [{ path: "../secret.typ", content: "secret" }] },
      { files: [{ path: "main.typ", content: "collision" }] },
      {
        files: [
          { path: "same.typ", content: "A" },
          { path: "same.typ", content: "B" },
        ],
      },
      { files: [{ path: "invalid.typ", encoding: "base64", content: "%%%" }] },
    ]) {
      const denied = await call("document_compile", {
        source: "Hello",
        filename: "invalid-virtual.pdf",
        ...extra,
      });
      expect(denied.ok, JSON.stringify(extra)).toBe(false);
    }
    expect(stderr).not.toContain(secret);
  }, 90_000);

  it("enforces decoded UTF-8 byte bounds before compilation", async () => {
    const tooLarge = await call("document_compile", {
      source: "é".repeat(600_000),
      filename: "source-limit.pdf",
    });
    expect(tooLarge).toMatchObject({
      ok: false,
      diagnostics: [{ code: "INPUT_LIMIT" }],
    });
    const total = await call("document_compile", {
      source: "Hello",
      files: Array.from({ length: 9 }, (_, index) => ({
        path: `data-${index}.txt`,
        kind: "data",
        content: "x".repeat(1_000_000),
      })),
      filename: "total-limit.pdf",
    });
    expect(total).toMatchObject({
      ok: false,
      diagnostics: [{ code: "INPUT_LIMIT" }],
    });
    expect(
      (await readdir(root)).filter((name) => name.endsWith("-limit.pdf"))
    ).toEqual([]);
  }, 30_000);

  it("rejects normative output-name vectors without changing an existing file", async () => {
    const vectors = JSON.parse(
      await readFile(
        new URL("../../../spec/vectors/mcp-tools-v1.json", import.meta.url),
        "utf8"
      )
    );
    for (const filename of vectors.invalid) {
      // Empty filenames are rejected at MCP schema level, which may throw.
      try {
        const response = await call("document_compile", {
          source: "Hello",
          filename,
        });
        expect(response.ok, JSON.stringify(filename)).toBe(false);
      } catch (error) {
        if (filename !== "") throw error;
        expect(String(error)).toMatch(
          /invalid|length|minimum|argument|schema/i
        );
      }
    }
    const path = join(root, "existing.pdf");
    const original = Buffer.from("unchanged original bytes");
    await writeFile(path, original);
    expect(
      await call("document_compile", {
        source: "Replace",
        filename: "existing.pdf",
      })
    ).toMatchObject({ ok: false, diagnostics: [{ code: "OUTPUT_EXISTS" }] });
    expect(sha256(await readFile(path))).toBe(sha256(original));
  }, 30_000);

  it("writes independently readable PNG/SVG artifacts and preserves per-item failures", async () => {
    const oracle = createRequire(import.meta.url)("@holi/wasm-qr/node");
    for (const format of ["png", "svg"]) {
      const content = "Holi Local nativo: español, ñ y acentos";
      const batch = await call("qr_batch", {
        format,
        size: 768,
        items: [
          { content, filename: `qr-native.${format}` },
          { content: "x".repeat(2953), filename: `qr-over-capacity.${format}` },
        ],
      });
      expect(batch.ok).toBe(false);
      expect(batch.items[0], JSON.stringify(batch)).toMatchObject({
        index: 0,
        ok: true,
        verified: true,
        diagnostics: [],
      });
      expect(batch.items[1]).toMatchObject({ index: 1, ok: false });
      const bytes = await artifact(
        batch.items[0].artifact,
        format === "png" ? "image/png" : "image/svg+xml"
      );
      if (format === "png") {
        expect(oracle.decode_qr_image(bytes)).toBe(content);
        expect(bytes.readUInt32BE(16)).toBe(768);
        expect(bytes.readUInt32BE(20)).toBe(768);
      } else expect(oracle.verify_qr_svg(bytes.toString())).toBe(content);
    }
    expect(
      await call("qr_batch", {
        items: [
          { content: "A", filename: "same.png" },
          { content: "B", filename: "SAME.PNG" },
        ],
      })
    ).toMatchObject({ ok: false, diagnostics: [{ code: "DUPLICATE_OUTPUT" }] });
  }, 120_000);

  it("flags unreadable styles and only omits verified when explicitly disabled", async () => {
    const invisible = defaultStyle();
    invisible.layers.ink.color = "#ffffff";
    const unreadable = await call("qr_batch", {
      style: invisible,
      size: 256,
      items: [{ content: "invisible", filename: "invisible.png" }],
    });
    expect(unreadable).toMatchObject({
      ok: true,
      items: [
        {
          ok: true,
          verified: false,
          diagnostics: [{ severity: "warning" }],
        },
      ],
    });
    await artifact(unreadable.items[0].artifact, "image/png");
    const unchecked = await call("qr_batch", {
      verify: false,
      items: [{ content: "unchecked", filename: "unchecked.png" }],
    });
    expect(unchecked.items[0]).toMatchObject({ ok: true, diagnostics: [] });
    expect(unchecked.items[0]).not.toHaveProperty("verified");
    const unsupported = defaultStyle();
    unsupported.frame.enabled = true;
    expect(
      await call("qr_batch", {
        style: unsupported,
        items: [{ content: "unsupported", filename: "unsupported.png" }],
      })
    ).toMatchObject({
      ok: false,
      diagnostics: [{ code: "UNSUPPORTED_STYLE" }],
    });
  }, 60_000);

  it("retains exclusive-create protection when independent native servers race", async () => {
    const peer = await connect(root);
    try {
      const results = await Promise.all(
        [client, peer].map((connection, index) =>
          call(
            "document_compile",
            {
              source: `Race ${index}`,
              filename: "race.pdf",
            },
            connection
          )
        )
      );
      expect(results.filter((result) => result.ok)).toHaveLength(1);
      expect(results.find((result) => !result.ok)).toMatchObject({
        diagnostics: [{ code: "OUTPUT_EXISTS" }],
      });
      await artifact(
        results.find((result) => result.ok).artifact,
        "application/pdf"
      );
    } finally {
      await peer.close();
    }
  }, 90_000);

  it("rejects symlink targets and replaced output-directory identities", async () => {
    const output = join(root, "identity-output");
    const outside = join(root, "outside");
    await mkdir(output);
    await mkdir(outside);
    const isolated = await connect(output);
    try {
      await symlink(outside, join(output, "linked.pdf"), "junction");
      expect(
        (
          await call(
            "document_compile",
            { source: "Hello", filename: "linked.pdf" },
            isolated
          )
        ).ok
      ).toBe(false);
      expect(await readdir(outside)).toEqual([]);
      await rename(output, join(root, "original-output"));
      await mkdir(output);
      expect(
        await call(
          "document_compile",
          { source: "Hello", filename: "changed.pdf" },
          isolated
        )
      ).toMatchObject({
        ok: false,
        diagnostics: [{ code: "OUTPUT_CHANGED" }],
      });
      expect(await readdir(output)).toEqual([]);
    } finally {
      await isolated.close();
    }
  }, 30_000);

  it("cancels an in-flight render, terminates its native child and releases the queue", async () => {
    const transport = transports.get(client)!;
    const serverPid = transport.pid;
    expect(serverPid).toBeTypeOf("number");
    // Check that OS metadata is available before launching a long-lived job.
    await childPids(serverPid!);
    const sent: Array<{ method: string; id?: unknown; requestId?: unknown }> =
      [];
    const send = transport.send.bind(transport);
    transport.send = async (message) => {
      if ("method" in message)
        sent.push({
          method: message.method,
          id: "id" in message ? message.id : undefined,
          requestId: (message.params as { requestId?: unknown } | undefined)
            ?.requestId,
        });
      await send(message);
    };
    const controller = new AbortController();
    // Attach a rejection handler before cancellation to avoid an unhandled
    // client promise while independently observing the operating-system child.
    const pending = client
      .callTool(
        {
          name: "document_compile",
          arguments: {
            source: expensiveSource,
            filename: "cancelled.pdf",
          },
        },
        undefined,
        { signal: controller.signal, timeout: 90_000 }
      )
      .then(
        (response) => ({ response, error: undefined }),
        (error: unknown) => ({ response: undefined, error })
      );
    let children: number[] = [];
    const deadline = Date.now() + 10_000;
    while (!children.length && Date.now() < deadline) {
      children = await childPids(serverPid!);
      if (!children.length) await delay(50);
    }
    controller.abort(new Error("Native acceptance requested cancellation"));
    const result = await pending;
    transport.send = send;
    const requestId = sent.find(
      (message) => message.method === "tools/call"
    )?.id;
    expect(requestId).toBeDefined();
    expect(sent).toContainEqual({
      method: "notifications/cancelled",
      id: undefined,
      requestId,
    });
    expect(await call("holi_info", {}, client, 5000)).toMatchObject({
      ok: true,
    });
    const resumed = await call(
      "document_compile",
      {
        source: "Cancellation released the work queue",
        filename: "cancel-fast-probe.pdf",
      },
      client,
      5000
    );
    expect(resumed).toMatchObject({ ok: true });
    await artifact(resumed.artifact, "application/pdf");
    expect(
      children.length,
      "The test must observe a real render child before cancellation"
    ).toBeGreaterThan(0);
    expect(result.error).toBeDefined();
    expect(result.response).toBeUndefined();
    const stopDeadline = Date.now() + 10_000;
    let stillRunning = children;
    while (stillRunning.length && Date.now() < stopDeadline) {
      const current = await childPids(serverPid!);
      stillRunning = children.filter((pid) => current.includes(pid));
      if (stillRunning.length) await delay(50);
    }
    expect(
      stillRunning,
      "Cancelled render children must not remain running"
    ).toEqual([]);
    expect(await call("holi_info", {}, client, 5000)).toMatchObject({
      ok: true,
    });
    const recovered = await call(
      "document_compile",
      {
        source: "Recovered after cancellation",
        filename: "cancel-recovered.pdf",
      },
      client,
      10_000
    );
    expect(recovered).toMatchObject({ ok: true });
    await artifact(recovered.artifact, "application/pdf");
    expect(await readdir(root)).not.toContain("cancelled.pdf");
  }, 40_000);

  it("keeps discovery responsive, bounds the queue, kills a 60-second job and recovers", async () => {
    const started = Date.now();
    const stalled = call("document_compile", {
      source: expensiveSource,
      filename: "timed-out.pdf",
    });
    // Allow the first request to enter the disposable compiler before adding work.
    await delay(250);
    const alive = Date.now();
    expect(await call("holi_info", {}, client, 5000)).toMatchObject({
      ok: true,
    });
    expect(Date.now() - alive).toBeLessThan(5000);
    const queued = Array.from({ length: 9 }, (_, index) =>
      call(
        "document_compile",
        {
          source: `Queued ${index}`,
          filename: `queued-${index}.pdf`,
        },
        client,
        120_000
      )
    );
    const timeout = await stalled;
    expect(timeout).toMatchObject({
      ok: false,
      diagnostics: [{ code: "TIMEOUT" }],
    });
    expect(Date.now() - started).toBeGreaterThanOrEqual(55_000);
    expect(Date.now() - started).toBeLessThan(80_000);
    const results = await Promise.all(queued);
    expect(
      results.filter((result) =>
        result.diagnostics.some((item: any) => item.code === "BUSY")
      ).length
    ).toBeGreaterThan(0);
    expect(results.some((result) => result.ok)).toBe(true);
    const recovered = await call("document_compile", {
      source: "Recovered after timeout",
      filename: "timeout-recovered.pdf",
    });
    expect(recovered, JSON.stringify(recovered)).toMatchObject({ ok: true });
    await artifact(recovered.artifact, "application/pdf");
    expect(await readdir(root)).not.toContain("timed-out.pdf");
    expect(stderr).toBe("");
  }, 150_000);
});

async function childPids(parent: number): Promise<number[]> {
  if (!Number.isSafeInteger(parent) || parent <= 0)
    throw new Error("Invalid server process ID");
  if (process.platform === "win32") {
    const executable = join(
      process.env.SYSTEMROOT ?? "C:\\Windows",
      "System32",
      "WindowsPowerShell",
      "v1.0",
      "powershell.exe"
    );
    const result = await runFile(
      executable,
      [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        `Get-CimInstance -ClassName Win32_Process -Filter 'ParentProcessId = ${parent}' | Where-Object { $_.Name -eq '${basename(binary).replaceAll("'", "''")}' } | ForEach-Object { try { $nativeWorker = Get-Process -Id $_.ProcessId -ErrorAction Stop; if (-not $nativeWorker.HasExited) { $_.ProcessId } } catch {} }`,
      ],
      { encoding: "utf8", timeout: 10_000, windowsHide: true }
    );
    return result.stdout.trim().split(/\s+/).filter(Boolean).map(Number);
  }
  const result = await runFile("ps", ["-axo", "pid=,ppid="], {
    encoding: "utf8",
    timeout: 10_000,
  });
  return result.stdout
    .trim()
    .split("\n")
    .map((line) => line.trim().split(/\s+/).map(Number))
    .filter(([, ppid]) => ppid === parent)
    .map(([pid]) => pid);
}

async function freePort() {
  const socket = createServer();
  await new Promise<void>((done, fail) => {
    socket.once("error", fail);
    socket.listen(0, "127.0.0.1", done);
  });
  const port = (socket.address() as { port: number }).port;
  await new Promise<void>((done, fail) =>
    socket.close((error) => (error ? fail(error) : done()))
  );
  return port;
}

async function stop(child: ChildProcess) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const closed = new Promise<void>((done) => child.once("close", () => done()));
  child.kill();
  await closed;
}

async function httpStatus(
  url: URL,
  headers: Record<string, string> = {},
  body = "{}"
) {
  return new Promise<number>((done, fail) => {
    const req = request(
      url,
      {
        method: "POST",
        agent: false,
        headers: { "Content-Type": "application/json", ...headers },
      },
      (res) => {
        res.resume();
        done(res.statusCode!);
      }
    );
    req.once("error", (error) =>
      fail(
        new Error(
          `HTTP test request failed (path=${url.pathname}, declaredLength=${headers["Content-Length"] ?? "automatic"}, bodyBytes=${Buffer.byteLength(body)}, chunked=${headers["Transfer-Encoding"] === "chunked"}): ${error.message}`
        )
      )
    );
    req.setTimeout(5000, () =>
      req.destroy(new Error("HTTP test request timed out"))
    );
    if (headers["Transfer-Encoding"] === "chunked") {
      // Exercise streamed accounting with separate chunks. A single oversized
      // chunk can be reset before a server finishes flushing its 413 response.
      void (async () => {
        for (let offset = 0; offset < body.length; offset += 64 * 1024) {
          if (req.destroyed) return;
          req.write(body.slice(offset, offset + 64 * 1024));
          await delay(1);
        }
        if (!req.destroyed) req.end();
      })().catch(fail);
    } else req.end(body);
  });
}

it("serves authenticated Streamable HTTP and enforces Host, Origin, routes and the body bound", async () => {
  const port = await freePort();
  const token = `native-acceptance-${randomUUID()}`;
  const url = new URL(`http://127.0.0.1:${port}/mcp`);
  const server = spawn(
    binary,
    ["--output", root, "--transport", "http", "--port", String(port)],
    {
      env: { ...process.env, HOLI_MCP_TOKEN: token },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    }
  );
  let logs = "";
  server.stdout.on("data", (chunk) => {
    logs += chunk.toString();
  });
  server.stderr.on("data", (chunk) => {
    logs += chunk.toString();
  });
  const httpClient = new Client({
    name: "holi-native-http-acceptance",
    version: "1.0.0",
  });
  try {
    const deadline = Date.now() + 15_000;
    while (true) {
      try {
        expect(await httpStatus(url)).toBe(401);
        break;
      } catch (error) {
        if (server.exitCode !== null || Date.now() > deadline) throw error;
        await delay(50);
      }
    }
    await httpClient.connect(
      new StreamableHTTPClientTransport(url, {
        requestInit: { headers: { Authorization: `Bearer ${token}` } },
      })
    );
    expect((await httpClient.listTools()).tools).toHaveLength(5);
    expect(await call("holi_info", {}, httpClient)).toMatchObject({
      ok: true,
      packageDownloads: false,
    });
    const rendered = await call(
      "document_compile",
      { source: "HTTP native document", filename: "http.pdf" },
      httpClient
    );
    expect(rendered, JSON.stringify(rendered)).toMatchObject({ ok: true });
    await artifact(rendered.artifact, "application/pdf");
    // Preserve integer-valued JSON numbers even when the wire representation
    // has a fractional suffix; JSON.stringify would hide this distinction.
    const floatResponse = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        "MCP-Protocol-Version": "2025-11-25",
      },
      body: '{"jsonrpc":"2.0","id":991,"method":"tools/call","params":{"name":"qr_batch","arguments":{"size":128.0,"items":[{"content":"Holi float","filename":"http-float-size.png"}]}}}',
    });
    expect(floatResponse.status).toBe(200);
    const floatResult = (await floatResponse.json()).result.structuredContent;
    expect(floatResult).toMatchObject({ ok: true, items: [{ ok: true }] });
    const floatBytes = await artifact(
      floatResult.items[0].artifact,
      "image/png"
    );
    expect(floatBytes.readUInt32BE(16)).toBe(128);
    expect(floatBytes.readUInt32BE(20)).toBe(128);
    for (const [headers, status] of [
      [{}, 401],
      [{ Authorization: "Bearer incorrect" }, 401],
      [
        {
          Authorization: `Bearer ${token}`,
          Origin: "https://attacker.example",
        },
        403,
      ],
      [{ Authorization: `Bearer ${token}`, Host: "attacker.example" }, 403],
      [{ Authorization: `Bearer ${token}`, "Content-Type": "text/plain" }, 415],
    ] as const)
      expect(await httpStatus(url, headers)).toBe(status);
    expect(
      await httpStatus(new URL("/artifact.pdf", url), {
        Authorization: `Bearer ${token}`,
      })
    ).toBe(404);
    expect(
      await httpStatus(url, {
        Authorization: `Bearer ${token}`,
        "Content-Length": String(12 * 1024 * 1024 + 1),
      })
    ).toBe(413);
    expect(
      await httpStatus(
        url,
        {
          Authorization: `Bearer ${token}`,
          "Transfer-Encoding": "chunked",
        },
        "x".repeat(12 * 1024 * 1024 + 1)
      )
    ).toBe(413);
    expect(await call("holi_info", {}, httpClient)).toMatchObject({ ok: true });
    expect(logs).not.toContain(token);
    expect(logs).not.toContain(root);
  } finally {
    await httpClient.close();
    await stop(server);
  }
}, 120_000);

describe("native startup privacy", () => {
  const privateValue = `HOLI_PRIVATE_${randomUUID().replaceAll("-", "")}`;
  const missing = join(tmpdir(), privateValue);
  it.each([
    { args: [], reason: /output folder.*required/i },
    { args: [privateValue], reason: /positional arguments/i },
    { args: [`--${privateValue}`], reason: /unknown option/i },
    { args: ["--output"], reason: /missing or invalid value/i },
    { args: ["--output", missing], reason: /does not exist/i },
    {
      args: ["--output", tmpdir(), "--transport", privateValue],
      reason: /invalid transport/i,
    },
    {
      args: [
        "--output",
        tmpdir(),
        "--transport",
        "http",
        "--port",
        privateValue,
      ],
      reason: /invalid port/i,
    },
    {
      args: ["--output", tmpdir(), "--transport", "http"],
      reason: /HOLI_MCP_TOKEN must contain/i,
    },
  ])("reports safe startup diagnostics for $args", ({ args, reason }) => {
    const result = spawnSync(binary, args, {
      encoding: "utf8",
      timeout: 10_000,
      windowsHide: true,
      env: { ...process.env, HOLI_MCP_TOKEN: "short-private-secret" },
    });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toMatch(reason);
    expect(result.stderr).not.toContain(privateValue);
    expect(result.stderr).not.toContain("short-private-secret");
    expect(result.stderr).not.toContain(tmpdir());
  });
});
