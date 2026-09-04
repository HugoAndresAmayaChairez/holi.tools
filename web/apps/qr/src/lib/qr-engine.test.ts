/**
 * qr-engine.test.ts — Unit tests for QR engine defaults and state
 */
import { describe, it, expect } from "vitest";
import { state } from "./qr-engine";
import type { BodyShape, EyeFrameShape, EyeBallShape } from "./qr-engine";

describe("qr-engine", () => {
  describe("state", () => {
    it("should have empty initial text", () => {
      expect(state.text).toBe("");
    });

    it("should have a valid default config", () => {
      expect(state.config).toBeDefined();
      expect(state.config.fg).toBe("#000000");
      expect(state.config.bg).toBe("#ffffff");
      expect(state.config.ecc).toBe("M");
    });

    it("should default to square shapes", () => {
      expect(state.config.bodyShape).toBe("square");
      expect(state.config.eyeFrameShape).toBe("square");
      expect(state.config.eyeBallShape).toBe("square");
    });

    it("should have default logo settings", () => {
      expect(state.config.logoSize).toBe(0.2);
      expect(state.config.logoColor).toBe("original");
      expect(state.config.logoBgEnabled).toBe(true);
      expect(state.config.logoBgShape).toBe("rounded");
      expect(state.config.logoScale).toBe(1.0);
    });

    it("should have empty history and collections", () => {
      expect(state.recent).toEqual([]);
      expect(state.collections).toEqual([]);
    });
  });

  describe("type exports", () => {
    it("should accept valid body shapes", () => {
      const validShapes: BodyShape[] = [
        "square",
        "rounded",
        "dots",
        "tiny-dots",
        "diamond",
        "star",
        "clover",
        "capsule",
        "chain",
        "pixel",
        "water",
      ];
      validShapes.forEach((shape) => {
        const cfg = { ...state.config, bodyShape: shape };
        expect(cfg.bodyShape).toBe(shape);
      });
    });

    it("should accept valid eye frame shapes", () => {
      const validShapes: EyeFrameShape[] = [
        "square",
        "rounded",
        "circle",
        "diamond",
        "cushion",
        "leaf",
        "clover-frame",
        "bevel",
        "orbit",
        "flux",
      ];
      validShapes.forEach((shape) => {
        const cfg = { ...state.config, eyeFrameShape: shape };
        expect(cfg.eyeFrameShape).toBe(shape);
      });
    });

    it("should accept valid eye ball shapes", () => {
      const validShapes: EyeBallShape[] = [
        "square",
        "rounded",
        "circle",
        "diamond",
        "star",
        "heart",
        "hexagon",
        "dots-grid",
        "bars-h",
        "bars-v",
      ];
      validShapes.forEach((shape) => {
        const cfg = { ...state.config, eyeBallShape: shape };
        expect(cfg.eyeBallShape).toBe(shape);
      });
    });
  });
});
