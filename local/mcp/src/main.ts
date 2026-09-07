#!/usr/bin/env node
import { parseArgs } from "node:util";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createOutputFolder } from "./output.js";
import { createService } from "./server.js";
import { startHttp } from "./http.js";
import { version } from "./info.js";
import { startupReason } from "./startup.js";

try {
  const { values } = parseArgs({
    options: {
      output: { type: "string" },
      transport: { type: "string", default: "stdio" },
      port: { type: "string", default: "8788" },
      "allow-packages": { type: "boolean", default: false },
      help: { type: "boolean" },
      version: { type: "boolean" },
    },
    allowPositionals: false,
    strict: true,
  });
  if (values.help || values.version) {
    process.stdout.write(
      values.version
        ? `${version}\n`
        : "Holi Local MCP server\nUsage: holi-mcp --output <existing absolute folder> [--transport stdio|http] [--port 8788] [--allow-packages]\nHTTP requires HOLI_MCP_TOKEN (32+ characters) and binds only 127.0.0.1.\n"
    );
  } else {
    if (!values.output) throw new Error("An output folder is required");
    if (!["stdio", "http"].includes(values.transport))
      throw new Error("Invalid transport");
    const output = await createOutputFolder(values.output);
    const createServer = createService(output, values["allow-packages"]);
    if (values.transport === "stdio") {
      const server = createServer();
      await server.connect(new StdioServerTransport());
    } else {
      if (
        !/^\d+$/.test(values.port) ||
        Number(values.port) < 1 ||
        Number(values.port) > 65535
      )
        throw new Error("Invalid port");
      const http = await startHttp(
        createServer,
        process.env.HOLI_MCP_TOKEN ?? "",
        Number(values.port)
      );
      // No content, path, token or request logging.
      process.stderr.write("Holi Local HTTP MCP listening on loopback.\n");
      const shutdown = () => {
        http.close();
        http.closeIdleConnections();
      };
      process.once("SIGINT", shutdown);
      process.once("SIGTERM", shutdown);
    }
  }
} catch (error) {
  process.stderr.write(
    `Holi Local could not start: ${startupReason(error)}\nRun with --help for usage; the output folder must exist and be an absolute local path.\n`
  );
  process.exitCode = 1;
}
