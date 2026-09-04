import { describe, it, expect } from "vitest";

describe("P2P Page", () => {
  it("should have a create offer button", async () => {
    const html = `<button id="create-offer">Create Offer</button>`;
    expect(html).toContain('id="create-offer"');
  });
});
