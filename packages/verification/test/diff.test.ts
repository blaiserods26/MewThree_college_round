import { describe, it, expect } from "bun:test";
import { compareScreenshots } from "../src/diff.js";

describe("Visual Regression Diff Engine", () => {
  it("compares identical screenshot buffers and reports 0% diff and passed=true", () => {
    // Generate a 10x10 dummy PNG buffer
    const mockPng = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNk+M9QzwAEjDAGYzMGAP4dBgE8xK5ZAAAAAElFTkSuQmCC",
      "base64"
    );

    const result = compareScreenshots(mockPng, mockPng);
    expect(result.diffPercentage).toBe(0);
    expect(result.diffPixels).toBe(0);
    expect(result.passed).toBe(true);
    expect(result.baselineScreenshotBase64).toBeDefined();
    expect(result.patchedScreenshotBase64).toBeDefined();
  });

  it("detects differences between contrasting screenshot buffers", () => {
    // Red 10x10 PNG
    const redPng = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQzwAEjDAGYzMGAP4dBgE8xK5ZAAAAAElFTkSuQmCC",
      "base64"
    );
    // Green 10x10 PNG
    const greenPng = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNkYPjPzwAEjDAGYzMGAP4dBgE8xK5ZAAAAAElFTkSuQmCC",
      "base64"
    );

    const result = compareScreenshots(redPng, greenPng, { thresholdPercent: 1.0 });
    expect(result.diffPixels).toBeGreaterThan(0);
    expect(result.diffPercentage).toBeGreaterThan(0);
  });
});
