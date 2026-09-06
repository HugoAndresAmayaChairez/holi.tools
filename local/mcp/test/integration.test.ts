import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  mkdtemp,
  readFile,
  rm,
  writeFile,
  mkdir,
  rename,
  symlink,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { request } from "node:http";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createOutputFolder } from "../dist/output.js";
import { createService } from "../dist/server.js";
import { startHttp } from "../dist/http.js";
import { createWorkQueue, runJob } from "../dist/jobs.js";
import { documentTemplates } from "@holi/engine-typst";
import { defaultStyle } from "@holi/engine-qr";

let root: string;
let client: Client;
let transport: StdioClientTransport;
let stderr = "";
const call = async (name: string, args: Record<string, unknown> = {}) => {
  const response = await client.callTool({ name, arguments: args }, undefined, {
    timeout: 120_000,
  });
  return response.structuredContent as any;
};
beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "holi-mcp-test-"));
  client = new Client({ name: "holi-test-stdio", version: "1.0.0" });
  transport = new StdioClientTransport({
    command: process.execPath,
    args: [
      fileURLToPath(new URL("../dist/main.js", import.meta.url)),
      "--output",
      root,
    ],
    stderr: "pipe",
  });
  transport.stderr?.on("data", (chunk) => {
    stderr += chunk.toString();
  });
  await client.connect(transport);
}, 30_000);
afterAll(async () => {
  await client?.close();
  const path = resolve(root);
  if (
    !path.startsWith(resolve(tmpdir()) + sep) ||
    !basename(path).startsWith("holi-mcp-test-")
  )
    throw new Error("Invalid test cleanup root");
  await rm(path, { recursive: true, force: true });
});

describe("real stdio MCP lifecycle", () => {
  it("discovers tools, templates, privacy and skill resources", async () => {
    expect(
      (await client.listTools()).tools.map((tool) => tool.name).sort()
    ).toEqual([
      "document_compile",
      "document_render",
      "document_templates",
      "holi_info",
      "qr_batch",
    ]);
    const info = await call("holi_info");
    expect(info.version).toBe("0.1.0");
    expect(info.packageDownloads).toBe(false);
    expect(info.outputFolder).toBe(await (await createOutputFolder(root)).root);
    expect((await call("document_templates")).templates).toHaveLength(2);
    expect((await client.listResources()).resources).toHaveLength(4);
    expect(
      (await client.readResource({ uri: "holi://privacy" })).contents[0]
    ).toHaveProperty("text");
    expect(
      (await client.readResource({ uri: "holi://skills/holi-documents" }))
        .contents[0]
    ).toHaveProperty("text");
  });
  it("compiles both bundled templates offline using literal data", async () => {
    for (const template of documentTemplates) {
      const response = await call("document_render", {
        template: template.id,
        data: template.example,
        filename: `${template.id}.pdf`,
      });
      expect(response, JSON.stringify(response)).toMatchObject({
        ok: true,
        v: 1,
      });
      expect(response.artifact.sha256).toMatch(/^[a-f0-9]{64}$/);
      const pdf = await readFile(response.artifact.path);
      expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
      expect(pdf.length).toBeGreaterThan(2000);
    }
    const response = await call("document_render", {
      template: "report",
      data: {
        title: 'Título #panic("not code")',
        sections: [
          { heading: "Resultado", body: 'ñ & < > $x$ #read("secret")' },
        ],
      },
      filename: "literal.pdf",
    });
    expect(response, JSON.stringify(response)).toMatchObject({ ok: true });
  }, 120_000);
  it("returns diagnostics and recovers without workspace data leaking across calls", async () => {
    const bad = await call("document_compile", {
      source: "#unknown_holi_variable",
      filename: "bad.pdf",
    });
    expect(bad.ok).toBe(false);
    expect(bad.diagnostics[0].severity).toBe("error");
    const withFile = await call("document_compile", {
      source: '#include "part.typ"',
      files: [{ path: "part.typ", kind: "typst", content: "Only this job" }],
      filename: "include.pdf",
    });
    expect(withFile, JSON.stringify(withFile)).toMatchObject({ ok: true });
    const without = await call("document_compile", {
      source: '#include "part.typ"',
      filename: "no-leak.pdf",
    });
    expect(without.ok).toBe(false);
    const good = await call("document_compile", {
      source: "= Recovery\nHello",
      filename: "recovery.pdf",
    });
    expect(good, JSON.stringify(good)).toMatchObject({ ok: true });
  }, 120_000);
  it("denies host-file reads and package downloads by default", async () => {
    await writeFile(join(root, "host-secret.txt"), "PRIVATE_SENTINEL");
    const host = await call("document_compile", {
      source: `#read(${JSON.stringify(join(root, "host-secret.txt").replaceAll("\\", "/"))})`,
      filename: "host-read.pdf",
    });
    expect(host.ok).toBe(false);
    expect(JSON.stringify(host)).not.toContain("PRIVATE_SENTINEL");
    const remote = await call("document_compile", {
      source: '#import "@preview/cetz:0.3.4"',
      filename: "remote.pdf",
    });
    expect(remote.ok).toBe(false);
    expect(
      remote.diagnostics.some((item: any) => item.message.includes("disabled"))
    ).toBe(true);
  }, 90_000);
  it("rejects traversal, schema errors and existing output without modifying it", async () => {
    expect(
      (
        await call("document_compile", {
          source: "Hello",
          filename: "../escape.pdf",
        })
      ).ok
    ).toBe(false);
    expect(
      (
        await call("document_compile", {
          source: "Hello",
          filename: "escape.pdf",
          mainPath: "../main.typ",
        })
      ).ok
    ).toBe(false);
    expect(
      (
        await call("document_compile", {
          source: "Hello",
          filename: "escape.pdf",
          files: [{ path: "main.typ", content: "collision" }],
        })
      ).ok
    ).toBe(false);
    expect(
      (
        await call("document_render", {
          template: "report",
          data: { title: 7 },
          filename: "bad-data.pdf",
        })
      ).ok
    ).toBe(false);
    const path = join(root, "existing.pdf");
    await writeFile(path, "keep me");
    const collision = await call("document_compile", {
      source: "Hello",
      filename: "existing.pdf",
    });
    expect(collision.diagnostics[0].code).toBe("OUTPUT_EXISTS");
    expect(await readFile(path, "utf8")).toBe("keep me");
  });
  it("renders actual SVG/PNG QR batches and preserves partial failures", async () => {
    const wasm = createRequire(import.meta.url)("@holi/wasm-qr/node");
    for (const format of ["svg", "png"]) {
      const output = await call("qr_batch", {
        format,
        size: 512,
        items: [
          { content: "Holi Local ñ", filename: `qr-good.${format}` },
          { content: "x".repeat(2953), filename: `too-long.${format}` },
        ],
      });
      expect(output.ok).toBe(false);
      expect(output.items[0], JSON.stringify(output)).toMatchObject({
        ok: true,
        index: 0,
        verified: true,
        diagnostics: [],
      });
      expect(output.items[1]).toMatchObject({ ok: false, index: 1 });
      const bytes = await readFile(output.items[0].artifact.path);
      if (format === "svg")
        expect(wasm.verify_qr_svg(bytes.toString())).toBe("Holi Local ñ");
      else {
        expect(wasm.decode_qr_image(bytes)).toBe("Holi Local ñ");
        expect(bytes.readUInt32BE(16)).toBe(512);
      }
    }
    expect(
      (
        await call("qr_batch", {
          items: [
            { content: "A", filename: "same.png" },
            { content: "B", filename: "SAME.PNG" },
          ],
        })
      ).diagnostics[0].code
    ).toBe("DUPLICATE_OUTPUT");
    // An unreadable style (white ink on white paper) is written, flagged and never claimed readable.
    const invisible = defaultStyle();
    invisible.layers.ink.color = "#ffffff";
    const unreadable = await call("qr_batch", {
      size: 256,
      style: invisible,
      items: [{ content: "invisible", filename: "invisible.png" }],
    });
    expect(unreadable.ok).toBe(true);
    expect(unreadable.items[0]).toMatchObject({ ok: true, verified: false });
    expect(unreadable.items[0].diagnostics[0].severity).toBe("warning");
    const skipped = await call("qr_batch", {
      verify: false,
      items: [{ content: "unchecked", filename: "unchecked.png" }],
    });
    expect(skipped.items[0]).toMatchObject({ ok: true, diagnostics: [] });
    expect(skipped.items[0]).not.toHaveProperty("verified");
    expect(stderr).toBe("");
  }, 180_000);
});

it("protects output identity, symlinks and racing exclusive writes", async () => {
  const directory = join(root, "isolated");
  await mkdir(directory);
  const output = await createOutputFolder(directory);
  const attempts = await Promise.allSettled([
    output.write("race.pdf", "pdf", Buffer.from("a"), "application/pdf"),
    output.write("race.pdf", "pdf", Buffer.from("b"), "application/pdf"),
  ]);
  expect(attempts.filter((item) => item.status === "fulfilled")).toHaveLength(
    1
  );
  const outside = join(root, "outside");
  await mkdir(outside);
  await symlink(outside, join(directory, "link.pdf"), "junction");
  await expect(
    output.write("link.pdf", "pdf", Buffer.from("x"), "application/pdf")
  ).rejects.toThrow();
  await rename(directory, join(root, "replaced-output"));
  await mkdir(directory);
  await expect(
    output.write("changed.pdf", "pdf", Buffer.from("x"), "application/pdf")
  ).rejects.toMatchObject({ code: "OUTPUT_CHANGED" });
});

it("exercises authenticated Streamable HTTP initialize/discovery and security rejection", async () => {
  const token = "test-token-".repeat(4);
  const server = await startHttp(
    createService(await createOutputFolder(root), false),
    token,
    0
  );
  const address = server.address() as { port: number };
  const url = new URL(`http://127.0.0.1:${address.port}/mcp`);
  const httpClient = new Client({ name: "holi-test-http", version: "1.0.0" });
  try {
    await httpClient.connect(
      new StreamableHTTPClientTransport(url, {
        requestInit: { headers: { Authorization: `Bearer ${token}` } },
      })
    );
    expect((await httpClient.listTools()).tools).toHaveLength(5);
    expect(
      (await httpClient.callTool({ name: "holi_info", arguments: {} }))
        .structuredContent
    ).toMatchObject({ ok: true });
    const rendered = await httpClient.callTool({
      name: "document_compile",
      arguments: { source: "HTTP document", filename: "http.pdf" },
    });
    expect(rendered.structuredContent).toMatchObject({ ok: true });
    for (const [headers, status] of [
      [{}, 401],
      [
        {
          Authorization: `Bearer ${token}`,
          Origin: "https://attacker.example",
        },
        403,
      ],
      [{ Authorization: `Bearer ${token}`, Host: "attacker.example" }, 403],
    ] as const) {
      const actual = await new Promise<number>((resolve) => {
        const req = request(
          url,
          {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
          },
          (res) => {
            res.resume();
            resolve(res.statusCode!);
          }
        );
        req.end("{}");
      });
      expect(actual, JSON.stringify(headers)).toBe(status);
    }
    expect(
      (
        await fetch(new URL("/file.pdf", url), {
          headers: { Authorization: `Bearer ${token}` },
        })
      ).status
    ).toBe(404);
  } finally {
    await httpClient.close();
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
});

it("bounds queued work and terminates a worker on timeout", async () => {
  const queue = createWorkQueue(1);
  let release!: () => void;
  const first = queue(
    () =>
      new Promise<void>((resolve) => {
        release = resolve;
      })
  );
  await expect(queue(async () => undefined)).rejects.toThrow("full");
  release();
  await first;
  await expect(
    runJob(
      {
        kind: "document",
        source:
          "#let count = 0\n#for a in range(10000) { for b in range(10000) { count += a + b } }\n#count",
        allowPackages: false,
      },
      1000
    )
  ).rejects.toThrow("time limit");
});
