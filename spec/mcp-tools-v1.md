# Spec: Holi Local MCP tools v1

Status: active (implementation review pending ADR 0003 acceptance)
Owner: Holi Local
Last updated: 2026-09-06

## Surface

Holi Local v0.2 is the `holi-mcp` native Rust executable with stdio (default)
and opt-in Streamable HTTP. It preserves the v1 tool contracts from the
historical Node v0.1 reference. Running the native product requires no Node/npm
installation or browser WASM compiler. Optional Typst package WASM plugins use
Typst's embedded interpreter inside the worker. It has no standalone document
CLI or desktop installer.
Tools:

| Tool                 | Inputs                                                                                          | Result                                           |
| -------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `holi_info`          | none                                                                                            | version, privacy, limits, support and Shadow Log |
| `document_templates` | none                                                                                            | manifests, JSON schemas and example data         |
| `document_render`    | template ID, JSON data, output filename                                                         | PDF artifact                                     |
| `document_compile`   | source, optional virtual files/mainPath, output filename                                        | PDF artifact                                     |
| `qr_batch`           | 1–100 items (content and filename), optional style, format svg/png, size, verify (default true) | ordered item results                             |

All tool results contain `v: 1`, `ok` and `diagnostics`; failures set MCP
`isError`. Artifacts contain absolute `path`, file `uri`, `mimeType`, byte count
and SHA-256. Batch items have an index, ok, diagnostics and optional artifact;
partial failure sets top-level ok false but keeps successful item results.
With `verify` on, each written item also carries `verified`: the rendered bytes
were decoded in worker memory with the local decoder (rxing) and matched the
exact input before writing. The server does not reopen the saved file. A written
but unreadable item stays `ok: true` with `verified: false` and a warning
diagnostic; verification is evidence for the local decoder, not a guarantee
for every scanner, size or print.
Diagnostics use document-template-v1 plus an optional stable `code` and `index`.
Schema errors are MCP invalid-argument errors. Tool errors never expose stacks.
Startup failures use fixed explanations for known error categories; they MUST
NOT print raw errors, paths, option values or positional arguments.
MCP resources expose privacy/version information and the two skill packs.

## Output-folder rules

The operator MUST supply an existing absolute local directory with `--output`.
The process resolves its real path at startup. Requests supply only a portable
basename: 1–120 ASCII letters/digits/dot/underscore/hyphen, beginning with a
letter or digit, matching the selected extension. Reject reserved Windows
device names, traversal, absolute paths, separators, ADS and duplicate batch
names (case-insensitive). The tool cannot change its output root.

Each request validates its targets before computing. Writes use exclusive
creation (`create_new`, mode 0600 on Unix), never overwrite a file or follow an existing
symlink. The root's identity/real path is checked again before writes; symlinks
or junctions replacing it fail. Failed writes remove only the file created by
that write. Successful earlier batch items remain. Interrupted processes may
leave an incomplete new file; no atomic whole-batch guarantee is made.
The operator must control the output folder and its ancestors: the runtime cannot
prevent concurrent hostile filesystem mutation by another process with the
same OS permissions. No arbitrary filesystem reader or artifact HTTP route.

## Transport and privacy

HTTP binds only 127.0.0.1, validates Host, rejects foreign Origin, requires a
Bearer token supplied in `HOLI_MCP_TOKEN` (at least 32 characters), and accepts
only `/mcp`. No CORS, request logging or token printing. JSON bodies have a
12 MiB bound for Content-Length and streamed/chunked bodies. Work is serialized
with a queue bounded to eight operations. Disposable native subprocesses have
a 60-second limit and are killed on timeout; synchronous rendering cannot
block the transport forever.

Before reading render input, workers install OS memory controls: Windows uses
a Job Object with a 1 GiB committed-process-memory limit; Linux lowers the
virtual-address-space limit to at most 2 GiB. macOS caps virtual address space
at its measured worker startup mappings plus 2 GiB, accounting for the mapped
shared region. Unix workers disable core dumps. These are different metrics,
not an RSS promise. Stricter inherited Unix limits are
preserved, and failure to install a control aborts the job. The advertised
limits must describe the active platform's metric accurately.

Input -> native process/worker memory -> disk in explicit output root -> optional
Typst package requests -> packages.typst.org sees technical metadata -> local
MCP client receives diagnostics and artifact paths. No Holi rendering service,
account, telemetry or automatic document upload. A cloud-backed assistant may
already send its prompts/tool inputs/results to its provider: the server cannot
make the assistant private. Acquiring release binaries or source dependencies
separately contacts their hosting/package providers. Users control output
deletion; workers are disposed after each job. Fonts, templates and MCP skill
resources are embedded for offline rendering.

## Verification

`vectors/mcp-tools-v1.json` covers filenames. Native executable SDK tests exercise
initialize, discovery, resources, compilation, QR, both transports, auth/origin
rejection, declared and streamed HTTP body limits, traversal, symlinks, conflicts,
bounded execution and recovery. Node and QR WASM may be used as external test
clients/oracles; they are not runtime dependencies of the native executable.
Actual Claude Desktop/Code Windows/macOS acceptance is recorded in the ADR;
SDK tests do not substitute for those client checks. The supplied Windows
v0.1 client report covers the old runtime, not native v0.2 acceptance.
