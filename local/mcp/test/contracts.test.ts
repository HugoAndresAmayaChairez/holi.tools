import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { validateFilename } from "../dist/output.js";
import { LocalPackageRegistry } from "../dist/packages.js";
import { MemoryAccessModel } from "@myriaddreamin/typst.ts/dist/esm/fs/memory.mjs";
import { gzipSync } from "node:zlib";
import { render } from "../dist/worker.js";

const vectors = JSON.parse(
  readFileSync(
    new URL("../../../spec/vectors/mcp-tools-v1.json", import.meta.url),
    "utf8"
  )
);
for (const name of vectors.valid)
  it(`accepts ${name}`, () =>
    expect(() => validateFilename(name, "pdf")).not.toThrow());
for (const name of vectors.invalid)
  it(`rejects ${JSON.stringify(name)}`, () =>
    expect(() => validateFilename(name, "pdf")).toThrow());

it("gates package fetches and confines archive paths to memory", async () => {
  const memory = new MemoryAccessModel();
  const disabled = new LocalPackageRegistry(memory, false);
  const spec = { namespace: "preview", name: "example", version: "0.1.0" };
  const context = { untar: () => undefined };
  const fetcher = vi.fn(
    async () => new Response(gzipSync(Buffer.from("tar fixture")))
  );
  vi.stubGlobal("fetch", fetcher);
  try {
    disabled.resolve(spec, context);
    expect(await disabled.fetchMissing()).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
    const registry = new LocalPackageRegistry(memory, true);
    registry.resolve({ ...spec, name: "../secret" }, context);
    expect(await registry.fetchMissing()).toBe(false);
    registry.resolve(spec, context);
    expect(await registry.fetchMissing()).toBe(true);
    expect(fetcher.mock.calls[0][0]).toBe(
      "https://packages.typst.org/preview/example-0.1.0.tar.gz"
    );
    expect(fetcher.mock.calls[0][1]).toMatchObject({ redirect: "error" });
    expect(() =>
      registry.resolve(spec, {
        untar: (_data, cb) => cb("../../secret", new Uint8Array(), 0),
      })
    ).toThrow("Invalid package archive");
    const root = registry.resolve(spec, {
      untar: (_data, cb) =>
        cb("main.typ", new TextEncoder().encode("Hello"), 0),
    });
    expect(memory.readAll(`${root}/main.typ`)).toEqual(
      new TextEncoder().encode("Hello")
    );
  } finally {
    vi.unstubAllGlobals();
  }
});

it("compiles a downloaded package and its transitive import after earlier misses", async () => {
  const requests: string[] = [];
  vi.stubGlobal("fetch", async (url: string) => {
    requests.push(url);
    const match = url.match(
      /^https:\/\/packages\.typst\.org\/preview\/(holi-parent|holi-child)-0\.1\.0\.tar\.gz$/
    );
    if (!match) throw new Error("Unexpected network request");
    return new Response(
      readFileSync(new URL(`./fixtures/${match[1]}.tar.gz`, import.meta.url))
    );
  });
  try {
    const outcome = await render({
      kind: "document",
      allowPackages: true,
      source: '#import "@preview/holi-parent:0.1.0": greeting\n#greeting',
    });
    expect(outcome.diagnostics).toEqual([]);
    expect(Buffer.from(outcome.data!).subarray(0, 5).toString()).toBe("%PDF-");
    expect(requests).toHaveLength(2);
  } finally {
    vi.unstubAllGlobals();
  }
});
