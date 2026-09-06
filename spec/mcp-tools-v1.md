# Spec: Holi Local MCP tools v1

Status: active (implementation review pending ADR 0003 acceptance)
Owner: Holi Local
Last updated: 2026-09-05

## Surface

`@holi/mcp` v0.1 is a Node 22+ MCP server with stdio (default) and opt-in
Streamable HTTP. It has no document CLI and no desktop installer. Tools:

| Tool                 | Inputs                                                                   | Result                                           |
| -------------------- | ------------------------------------------------------------------------ | ------------------------------------------------ |
| `holi_info`          | none                                                                     | version, privacy, limits, support and Shadow Log |
| `document_templates` | none                                                                     | manifests, JSON schemas and example data         |
| `document_render`    | template ID, JSON data, output filename                                  | PDF artifact                                     |
| `document_compile`   | source, optional virtual files/mainPath, output filename                 | PDF artifact                                     |
| `qr_batch`           | 1–100 items (content and filename), optional style, format svg/png, size, verify (default true) | ordered item results                             |

All tool results contain `v: 1`, `ok` and `diagnostics`; failures set MCP
`isError`. Artifacts contain absolute `path`, file `uri`, `mimeType`, byte count
and SHA-256. Batch items have an index, ok, diagnostics and optional artifact;
partial failure sets top-level ok false but keeps successful item results.
With `verify` on, each written item also carries `verified`: the file was read
back with the local decoder (rxing) and decoded to the exact input. A written
but unreadable item stays `ok: true` with `verified: false` and a warning
diagnostic; verification is evidence for the local decoder, not a guarantee
for every scanner, size or print.
Diagnostics use document-template-v1 plus an optional stable `code` and `index`.
Schema errors are MCP invalid-argument errors. Tool errors never expose stacks.
MCP resources expose privacy/version information and the two skill packs.

## Output-folder rules

The operator MUST supply an existing absolute local directory with `--output`.
The process resolves its real path at startup. Requests supply only a portable
basename: 1–120 ASCII letters/digits/dot/underscore/hyphen, beginning with a
letter or digit, matching the selected extension. Reject reserved Windows
device names, traversal, absolute paths, separators, ADS and duplicate batch
names (case-insensitive). The tool cannot change its output root.

Each request validates its targets before computing. Writes use exclusive
creation (`wx`, mode 0600), never overwrite a file or follow an existing
symlink. The root's identity/real path is checked again before writes; symlinks
or junctions replacing it fail. Failed writes remove only the file created by
that write. Successful earlier batch items remain. Interrupted processes may
leave an incomplete new file; no atomic whole-batch guarantee is made.
The operator must control the output folder and its ancestors: Node cannot
prevent concurrent hostile filesystem mutation by another process with the
same OS permissions. No arbitrary filesystem reader or artifact HTTP route.

## Transport and privacy

HTTP binds only 127.0.0.1, validates Host, rejects foreign Origin, requires a
Bearer token supplied in `HOLI_MCP_TOKEN` (at least 32 characters), and accepts
only `/mcp`. No CORS, request logging or token printing. JSON bodies have a
12 MiB bound. Work is serialized with a bounded queue and disposable workers
have a 60-second limit; synchronous WASM cannot block the transport forever.

Input -> process/worker memory -> disk in explicit output root -> optional
Typst package requests -> packages.typst.org sees technical metadata -> local
MCP client receives diagnostics and artifact paths. No Holi rendering service,
account, telemetry or automatic document upload. A cloud-backed assistant may
already send its prompts/tool inputs/results to its provider: the server cannot
make the assistant private. Installation also contacts the npm registry. Users
control output deletion; workers are disposed after each job.

## Verification

`vectors/mcp-tools-v1.json` covers filenames. SDK integration tests exercise
initialize, discovery, resources, compilation, QR, both transports, auth/origin
rejection, traversal, symlinks, conflicts, bounded execution and recovery.
Actual Claude Desktop/Code Windows/macOS acceptance is recorded in the ADR;
SDK tests do not substitute for those client checks.
