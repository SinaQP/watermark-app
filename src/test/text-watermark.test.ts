import { describe, expect, it } from "vitest";

import {
  clampLogoWidthToPosition,
  clampWatermarkPosition,
  fitLogoWidthToStage,
  getPresetPosition,
  getWatermarkBoundsForWidth,
  measureRotatedWatermarkBounds,
} from "@/lib/text-watermark";

describe("text watermark geometry", () => {
  it("keeps dragged positions within the visible image bounds", () => {
    const position = clampWatermarkPosition(
      { x: 0.02, y: 1.2 },
      { width: 800, height: 500 },
      { width: 220, height: 60 },
    );

    expect(position.x).toBeGreaterThan(0.15);
    expect(position.y).toBeLessThan(0.95);
  });

  it("keeps preset anchors inside different image sizes", () => {
    const stages = [
      { width: 2400, height: 1600 },
      { width: 1200, height: 1600 },
      { width: 900, height: 600 },
    ];
    const overlay = { width: 240, height: 64 };

    for (const stage of stages) {
      const topLeft = getPresetPosition("top-left", stage, overlay);
      const center = getPresetPosition("center", stage, overlay);
      const bottomRight = getPresetPosition("bottom-right", stage, overlay);

      expect(topLeft.x).toBeLessThan(0.5);
      expect(topLeft.y).toBeLessThan(0.5);
      expect(center.x).toBe(0.5);
      expect(center.y).toBe(0.5);
      expect(bottomRight.x).toBeGreaterThan(0.5);
      expect(bottomRight.y).toBeGreaterThan(0.5);

      expect(bottomRight.x + overlay.width / (2 * stage.width)).toBeLessThanOrEqual(1.02);
      expect(bottomRight.y + overlay.height / (2 * stage.height)).toBeLessThanOrEqual(1.02);
    }
  });

  it("fits rotated logos inside the stage bounds", () => {
    const width = fitLogoWidthToStage(420, { width: 280, height: 160 }, 32, 1.5);
    const bounds = measureRotatedWatermarkBounds(getWatermarkBoundsForWidth(width, 1.5), 32);

    expect(bounds.width).toBeLessThanOrEqual(280.5);
    expect(bounds.height).toBeLessThanOrEqual(160.5);
  });

  it("limits logo resizing at the current position", () => {
    const width = clampLogoWidthToPosition(
      500,
      { width: 800, height: 500 },
      { x: 0.82, y: 0.84 },
      0,
      1.5,
    );

    expect(width).toBeGreaterThan(120);
    expect(width).toBeLessThan(260);
  });
});
