import { describe, expect, it } from "vitest";
import { toCsv } from "./exporters";

describe("metadata exporters", () => {
  it("serializes rows using discovered columns", () => {
    expect(
      toCsv([
        { name: "a.jpg", size: 12 },
        { name: "b.jpg", type: "image/jpeg" },
      ])
    ).toBe("name,size,type\na.jpg,12,\nb.jpg,,image/jpeg\n");
  });

  it("escapes commas, quotes, and new lines", () => {
    expect(toCsv([{ title: 'hello, "world"', notes: "one\ntwo" }])).toBe(
      'title,notes\n"hello, ""world""","one\ntwo"\n'
    );
  });

  it("returns an empty document for empty rows", () => {
    expect(toCsv([])).toBe("");
  });
});
