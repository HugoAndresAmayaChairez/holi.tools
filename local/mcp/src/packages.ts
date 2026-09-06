import { gunzipSync } from "node:zlib";
import type {
  PackageRegistry,
  PackageSpec,
  PackageResolveContext,
} from "@myriaddreamin/typst.ts/dist/esm/internal.types.mjs";
import { MemoryAccessModel } from "@myriaddreamin/typst.ts/dist/esm/fs/memory.mjs";

/** Synchronous WASM resolution requests an async fetch between compilation attempts. */
export class LocalPackageRegistry implements PackageRegistry {
  readonly missing = new Map<string, PackageSpec>();
  private readonly archives = new Map<string, Uint8Array>();
  private readonly resolved = new Map<string, string>();
  private total = 0;
  constructor(
    private memory: MemoryAccessModel,
    private allowed: boolean
  ) {}

  resolve(
    spec: PackageSpec,
    context: PackageResolveContext
  ): string | undefined {
    if (
      spec.namespace !== "preview" ||
      !/^[a-z0-9][a-z0-9-]{0,63}$/.test(spec.name) ||
      !/^\d{1,5}\.\d{1,5}\.\d{1,5}$/.test(spec.version)
    )
      return undefined;
    const key = `${spec.name}-${spec.version}`;
    if (this.resolved.has(key)) return this.resolved.get(key);
    const archive = this.archives.get(key);
    if (!archive) {
      this.missing.set(key, spec);
      return undefined;
    }
    const root = `/@memory/packages/preview/${spec.name}/${spec.version}`;
    let count = 0;
    let total = 0;
    context.untar(archive, (path, data) => {
      const clean = path.replace(/^\.\//, "");
      if (
        ++count > 2000 ||
        (total += data.byteLength) > 32 * 1024 * 1024 ||
        !clean ||
        /[\\:]/.test(clean) ||
        [...clean].some((char) => char.charCodeAt(0) < 32) ||
        clean.startsWith("/") ||
        clean.split("/").some((part) => part === ".." || part === ".")
      )
        throw new Error("Invalid package archive");
      // typst.ts uses mtime=0 to mean a missing file.
      this.memory.insertFile(`${root}/${clean}`, data, new Date(1));
    });
    this.resolved.set(key, root);
    return root;
  }

  async fetchMissing(): Promise<boolean> {
    if (!this.allowed || !this.missing.size) return false;
    for (const [key] of this.missing) {
      if (this.archives.size >= 16)
        throw new Error("Package count limit exceeded");
      const response = await fetch(
        `https://packages.typst.org/preview/${key}.tar.gz`,
        {
          redirect: "error",
          signal: AbortSignal.timeout(15_000),
        }
      );
      if (!response.ok || !response.body)
        throw new Error("Package download failed");
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 10 * 1024 * 1024 || this.total + size > 32 * 1024 * 1024)
            throw new Error("Package size limit exceeded");
          chunks.push(value);
        }
      } finally {
        await reader.cancel();
      }
      const archive = Buffer.concat(chunks);
      // Bound decompression before passing the gzip archive into WASM.
      gunzipSync(archive, { maxOutputLength: 32 * 1024 * 1024 });
      this.archives.set(key, archive);
      this.total += size;
    }
    this.missing.clear();
    return true;
  }
}
