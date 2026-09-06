import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  createTypstEngine,
  isWorkspacePath,
  normalizeDiagnostics,
  prepareTemplate,
  type CompilerAdapter,
} from "../src/index.js";
const vectors = JSON.parse(
  readFileSync(
    new URL(
      "../../../../spec/vectors/document-template-v1.json",
      import.meta.url
    ),
    "utf8"
  )
);

describe("document template v1 vectors", () => {
  it("keeps user text in JSON, outside executable Typst source", () => {
    const prepared = prepareTemplate("report", vectors.literal);
    expect(JSON.parse(String(prepared.files[0].content))).toEqual(
      vectors.literal
    );
    expect(prepared.source).not.toContain(vectors.literal.title);
    expect(prepared.source).toContain('json("data.json")');
  });
  for (const data of vectors.invalidData)
    it(`rejects invalid template data ${JSON.stringify(data)}`, () => {
      expect(() => prepareTemplate("report", data)).toThrow();
    });
  it("rejects unsupported templates", () =>
    expect(() => prepareTemplate("../report", {})).toThrow());
  for (const path of vectors.paths.valid)
    it(`accepts virtual path ${path}`, () =>
      expect(isWorkspacePath(path)).toBe(true));
  for (const path of vectors.paths.invalid)
    it(`rejects virtual path ${JSON.stringify(path)}`, () =>
      expect(isWorkspacePath(path)).toBe(false));
  it("normalizes diagnostics with 1-based source locations", () => {
    expect(
      JSON.parse(JSON.stringify(normalizeDiagnostics(vectors.diagnostics.raw)))
    ).toEqual(vectors.diagnostics.expected);
  });
});

it("serializes workspace mounts and recovers after a failed compilation", async () => {
  const files = new Map<string, string | Uint8Array>();
  let active = 0;
  const adapter: CompilerAdapter = {
    resetShadow: () => {
      expect(active).toBe(0);
      files.clear();
    },
    addSource: (path, source) => {
      files.set(path, source);
    },
    mapShadow: (path, data) => {
      files.set(path, data);
    },
    getCompiler: async () => ({
      compile: async () => {
        active++;
        const source = files.get("/main.typ");
        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(files.get("/main.typ")).toBe(source);
        active--;
        if (source === "bad") throw new Error("Compiler error");
        return {
          result: new TextEncoder().encode(String(source)),
          diagnostics: [],
        };
      },
    }),
    getRenderer: async () => {
      throw new Error("Not needed");
    },
  };
  const engine = createTypstEngine(adapter);
  const outcomes = await Promise.allSettled([
    engine.compilePdf("one"),
    engine.compilePdf("bad"),
    engine.compilePdf("three"),
  ]);
  expect(outcomes.map((item) => item.status)).toEqual([
    "fulfilled",
    "rejected",
    "fulfilled",
  ]);
  expect(
    new TextDecoder().decode(
      (outcomes[2] as PromiseFulfilledResult<Uint8Array>).value
    )
  ).toBe("three");
});
