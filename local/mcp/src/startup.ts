/** Never print raw parser/filesystem errors: they can contain paths or arguments. */
export function startupReason(error: unknown): string {
  const safeMessages = new Set([
    "An output folder is required",
    "Invalid transport",
    "Invalid port",
    "HOLI_MCP_TOKEN must contain at least 32 non-whitespace characters",
  ]);
  if (!(error instanceof Error)) return "Unexpected initialization failure";
  if (safeMessages.has(error.message)) return error.message;

  const reasons = new Map([
    ["INVALID_OUTPUT", "Use an existing absolute local output directory"],
    ["ENOENT", "A required local path does not exist; check the output folder"],
    ["ENOTDIR", "The output path must be a directory"],
    ["EACCES", "Access denied; check output-folder and listening permissions"],
    [
      "EPERM",
      "Permission denied; check output-folder and listening permissions",
    ],
    ["EADDRINUSE", "The HTTP port is already in use; choose another port"],
    ["ERR_PARSE_ARGS_UNKNOWN_OPTION", "Unknown option; check --help"],
    [
      "ERR_PARSE_ARGS_UNEXPECTED_POSITIONAL",
      "Positional arguments are not supported",
    ],
    [
      "ERR_PARSE_ARGS_INVALID_OPTION_VALUE",
      "An option has a missing or invalid value",
    ],
    [
      "ERR_PARSE_ARGS_INVALID_OPTION_TYPE",
      "An option has an invalid value type",
    ],
  ]);
  const code =
    "code" in error && typeof error.code === "string" ? error.code : "";
  return reasons.get(code) ?? "Unexpected initialization failure";
}
