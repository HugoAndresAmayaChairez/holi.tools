import { createServer, type IncomingMessage } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export async function startHttp(
  createMcpServer: () => McpServer,
  token: string,
  port: number
) {
  if (
    token.length < 32 ||
    /\s/.test(token) ||
    [...token].some((char) => char.charCodeAt(0) < 32)
  )
    throw new Error(
      "HOLI_MCP_TOKEN must contain at least 32 non-whitespace characters"
    );
  let active = 0;
  const http = createServer(async (req, res) => {
    const reject = (status: number) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end('{"error":"Request rejected"}');
    };
    const address = http.address();
    const boundPort =
      typeof address === "object" && address ? address.port : port;
    const hosts = [`127.0.0.1:${boundPort}`, `localhost:${boundPort}`];
    if (
      !hosts.includes(req.headers.host ?? "") ||
      (req.headers.origin !== undefined &&
        !hosts.map((host) => `http://${host}`).includes(req.headers.origin))
    )
      return reject(403);
    const authorization = Buffer.from(req.headers.authorization ?? "");
    const expected = Buffer.from(`Bearer ${token}`);
    if (
      authorization.length !== expected.length ||
      !timingSafeEqual(authorization, expected)
    )
      return reject(401);
    if (req.url !== "/mcp") return reject(404);
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return reject(405);
    }
    if (
      !req.headers["content-type"]?.toLowerCase().startsWith("application/json")
    )
      return reject(415);
    if (active >= 16) return reject(429);
    active++;
    let server: McpServer | undefined;
    try {
      const body = await readBody(req);
      server = createMcpServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, body);
    } catch (error) {
      if (!res.headersSent && !res.destroyed)
        reject(error instanceof BodyLimitError ? 413 : 400);
    } finally {
      active--;
      await server?.close();
    }
  });
  http.requestTimeout = 30_000;
  http.headersTimeout = 10_000;
  http.maxHeadersCount = 40;
  await new Promise<void>((resolve, reject) => {
    http.once("error", reject);
    http.listen(port, "127.0.0.1", () => {
      http.off("error", reject);
      resolve();
    });
  });
  return http;
}

class BodyLimitError extends Error {}
async function readBody(req: IncomingMessage): Promise<unknown> {
  const limit = 12 * 1024 * 1024;
  if (Number(req.headers["content-length"]) > limit) throw new BodyLimitError();
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new BodyLimitError();
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
