import { describe, it, expect } from "vitest";
import { isValidSolanaAddress } from "./solana.js";

describe("isValidSolanaAddress", () => {
  it("accepts valid base58 Solana addresses", () => {
    expect(isValidSolanaAddress("4EtAJ1p8RjqccEVhEhaYnEgQ6kA4JHR8oYqyLFwARUj6")).toBe(true);
    expect(isValidSolanaAddress("11111111111111111111111111111111")).toBe(true);
    expect(isValidSolanaAddress("So11111111111111111111111111111111111111112")).toBe(true);
  });

  it("rejects empty string", () => {
    expect(isValidSolanaAddress("")).toBe(false);
  });

  it("rejects invalid base58 characters", () => {
    expect(isValidSolanaAddress("4EtAJ1p8RjqccEVhEhaYnEgQ6kA4JHR8oYqyLFwARUj0")).toBe(false); // 0/O confusion
    expect(isValidSolanaAddress("invalid!!!")).toBe(false);
    expect(isValidSolanaAddress("4EtAJ1p8RjqccEVhEhaYnEgQ6kA4JHR8oYqyLFwARUj6!")).toBe(false);
  });

  it("rejects wrong length", () => {
    expect(isValidSolanaAddress("short")).toBe(false);
    expect(isValidSolanaAddress("4EtAJ1p8RjqccEVhEhaYnEgQ6kA4JHR8oYqyLFwARUj")).toBe(false);
  });

  it("rejects non-string input", () => {
    expect(isValidSolanaAddress(null as unknown as string)).toBe(false);
    expect(isValidSolanaAddress(123 as unknown as string)).toBe(false);
  });
});
