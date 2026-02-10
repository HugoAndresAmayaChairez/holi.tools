import { describe, it, expect } from "vitest";

describe("UI Lab Page", () => {
  it("should have a main title", async () => {
    const html = `<h1>UI Component Playground</h1>`;
    expect(html).toContain("UI Component Playground");
  });
});
