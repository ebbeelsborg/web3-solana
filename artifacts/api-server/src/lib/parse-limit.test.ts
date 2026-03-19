import { describe, it, expect } from "vitest";
import { parseLimit } from "./parse-limit.js";

describe("parseLimit", () => {
  it("returns default when raw is undefined or empty", () => {
    expect(parseLimit(undefined, 50, 100)).toBe(50);
    expect(parseLimit("", 50, 100)).toBe(50);
  });

  it("parses valid numbers", () => {
    expect(parseLimit("10", 50, 100)).toBe(10);
    expect(parseLimit("1", 50, 100)).toBe(1);
    expect(parseLimit("100", 50, 100)).toBe(100);
  });

  it("clamps to max", () => {
    expect(parseLimit("999", 50, 100)).toBe(100);
    expect(parseLimit("1000", 50, 100)).toBe(100);
  });

  it("clamps to min 1", () => {
    expect(parseLimit("0", 50, 100)).toBe(1);
    expect(parseLimit("-5", 50, 100)).toBe(1);
  });

  it("uses default for NaN", () => {
    expect(parseLimit("abc", 50, 100)).toBe(50);
    expect(parseLimit("12.5", 50, 100)).toBe(12); // parseInt truncates
  });
});
