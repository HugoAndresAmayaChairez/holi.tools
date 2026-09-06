import { readFileSync } from "node:fs";

const manifest = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8")
);
export const version: string = manifest.version;
export const shadowLog = readFileSync(
  new URL("../CHANGELOG.md", import.meta.url),
  "utf8"
);
export const privacy = `Holi Local renders on this device, writes only new files inside the operator's explicit output folder, and does not upload documents or QR content. No account or telemetry. Output persists until you delete it. OS backup or sync software may copy files independently.
Input -> worker memory -> explicit output folder -> optional Typst package requests -> package provider sees IP, timing, package identifiers and request metadata -> local MCP client receives diagnostics and artifact paths.
Package downloads are disabled unless the operator starts the server with --allow-packages. If enabled, requests go only to packages.typst.org; downloaded packages stay in worker memory. Bundled fonts and templates work offline after installation. npm installation requires a registry connection.
Your AI client's provider may receive prompts, tool inputs, diagnostics and results under that client's settings; a local MCP server does not make a cloud assistant private. No provider receives document data from Holi Local itself.`;
export const info = {
  name: "Holi Local",
  version,
  privacy,
  shadowLog,
  support: "https://github.com/HugoAndresAmayaChairez/holi.tools/issues",
  donate: "https://ko-fi.com/holitools",
  limits: {
    sourceBytes: 1_048_576,
    totalInputBytes: 8_388_608,
    files: 100,
    batch: 100,
    pngSize: [128, 4096],
    jobSeconds: 60,
    queue: 8,
  },
};
