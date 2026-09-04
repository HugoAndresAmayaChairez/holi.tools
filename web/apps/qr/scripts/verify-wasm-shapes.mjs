#!/usr/bin/env node
/**
 * QR WASM (wasm-qr-svg) verification script.
 *
 * Usage:
 *   node scripts/verify-wasm-shapes.mjs
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// wasm-qr-svg supports these shape ids in Rust:
// 0 = square, 1 = dots, 2 = rounded, 3 = liquid/connected.
const SHAPE_IDS = [0, 1, 2, 3];
const TEST_TEXT = "https://holi.tools";

async function loadWasm() {
  const wasmJsPath = join(
    __dirname,
    "..",
    "..",
    "..",
    "..",
    "crates",
    "wasm",
    "wasm-qr-svg",
    "pkg",
    "holi_qr_svg.js"
  );

  if (!existsSync(wasmJsPath)) {
    console.error("WASM module not found at:", wasmJsPath);
    console.error(
      "Run: cd crates/wasm/wasm-qr-svg && wasm-pack build --target nodejs"
    );
    process.exit(1);
  }

  const mod = await import(pathToFileURL(wasmJsPath).href);
  if (typeof mod.default === "function") {
    await mod.default();
  }
  return mod;
}

function validateSvg(svg) {
  const issues = [];

  if (!svg || svg.length === 0) {
    issues.push("Empty SVG");
    return { valid: false, issues, pathCount: 0, length: 0 };
  }

  if (!svg.startsWith("<svg")) issues.push("Does not start with <svg");
  if (!svg.includes("</svg>")) issues.push("Missing </svg>");
  if (svg.includes("NaN") || svg.includes("undefined")) {
    issues.push("Contains NaN or undefined");
  }

  const pathCount = (svg.match(/<path/g) || []).length;
  if (pathCount === 0) issues.push("No path elements found");

  return {
    valid: issues.length === 0,
    issues,
    pathCount,
    length: svg.length,
  };
}

async function main() {
  console.log("QR WASM (wasm-qr-svg) verification\n");
  console.log("=".repeat(60) + "\n");

  console.log("Loading WASM module...");
  const wasm = await loadWasm();
  console.log("WASM loaded\n");

  const outputDir = join(__dirname, "..", "test-output", "wasm-shapes");
  mkdirSync(outputDir, { recursive: true });

  const results = {
    matrix: null,
    shapes: [],
  };

  console.log("Matrix\n");
  try {
    const raw = wasm.get_qr_matrix(TEST_TEXT, "M", -1);
    const ok = raw && raw.length > 1;
    const size = ok ? raw[0] : 0;
    console.log(ok ? `Matrix OK (${size}x${size})` : "Matrix failed");
    results.matrix = { ok, size, length: raw?.length ?? 0 };
  } catch (error) {
    console.log(`Matrix ERROR: ${error?.message || error}`);
    results.matrix = { ok: false, error: error?.message || String(error) };
  }

  console.log("\nSVG shape ids\n");
  for (const shapeId of SHAPE_IDS) {
    try {
      const svg = wasm.generate_svg(TEST_TEXT, shapeId, "M", -1);
      const validation = validateSvg(svg);
      const status = validation.valid ? "OK" : "FAIL";
      console.log(
        `${status} shapeId=${shapeId} paths:${validation.pathCount} len:${svg.length}`
      );
      results.shapes.push({
        shapeId,
        valid: validation.valid,
        issues: validation.issues,
      });
      writeFileSync(join(outputDir, `shape-${shapeId}.svg`), svg);
    } catch (error) {
      console.log(`FAIL shapeId=${shapeId} ERROR: ${error?.message || error}`);
      results.shapes.push({
        shapeId,
        valid: false,
        issues: [error?.message || String(error)],
      });
    }
  }

  writeFileSync(
    join(outputDir, "results.json"),
    JSON.stringify(results, null, 2)
  );

  const passed = results.shapes.filter((shape) => shape.valid).length;
  const matrixOk = Boolean(results.matrix?.ok);
  console.log("\n" + "=".repeat(60));
  console.log(`Matrix: ${matrixOk ? "OK" : "FAIL"}`);
  console.log(`Shapes: ${passed}/${SHAPE_IDS.length} passed`);
  console.log(
    `Results written to ${join("web", "apps", "qr", "test-output", "wasm-shapes")}`
  );

  process.exit(matrixOk && passed === SHAPE_IDS.length ? 0 : 1);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
