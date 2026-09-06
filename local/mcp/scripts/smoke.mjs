// Retained local fixtures for visual/client review. Never uses user documents.
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { documentTemplates } from "@holi/engine-typst";

const folder = new URL(`../test-output/review-${Date.now()}/`, import.meta.url);
await mkdir(folder, { recursive: true });
const client = new Client({ name: "holi-local-review", version: "1.0.0" });
const allowPackages = process.argv.includes("--allow-packages");
await client.connect(
  new StdioClientTransport({
    command: process.execPath,
    args: [
      fileURLToPath(new URL("../dist/main.js", import.meta.url)),
      "--output",
      fileURLToPath(folder),
      ...(allowPackages ? ["--allow-packages"] : []),
    ],
    stderr: "pipe",
  })
);
try {
  for (const template of documentTemplates) {
    const response = await client.callTool({
      name: "document_render",
      arguments: {
        template: template.id,
        data: template.example,
        filename: `${template.id}.pdf`,
      },
    });
    if (!response.structuredContent?.ok)
      throw new Error(
        `Template smoke failed: ${JSON.stringify(response.structuredContent)}`
      );
  }
  const qr = await client.callTool({
    name: "qr_batch",
    arguments: {
      format: "png",
      size: 512,
      items: [{ content: "https://holi.tools", filename: "holi.png" }],
    },
  });
  if (!qr.structuredContent?.ok) throw new Error("QR smoke failed");
  if (allowPackages) {
    const response = await client.callTool(
      {
        name: "document_compile",
        arguments: {
          source: '#import "@preview/cetz:0.3.4": canvas\n#canvas({})',
          filename: "package.pdf",
        },
      },
      undefined,
      { timeout: 90_000 }
    );
    if (!response.structuredContent?.ok)
      throw new Error(
        `Package smoke failed: ${JSON.stringify(response.structuredContent)}`
      );
  }
  process.stdout.write(`Review fixtures: ${fileURLToPath(folder)}\n`);
} finally {
  await client.close();
}
