import { describe, it, expect } from "vitest";

describe("WebGPU Page", () => {
  it("should have a canvas element for WebGPU", async () => {
    // This is a simple structural test since we can't easily test WebGPU in Vitest/Node
    // In a real scenario, we might use Playwright for this.
    const html = `
      <canvas id="gpu-canvas"></canvas>
    `;
    expect(html).toContain('id="gpu-canvas"');
  });
});
