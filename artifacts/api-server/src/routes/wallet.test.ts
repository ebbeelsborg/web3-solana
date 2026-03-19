import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import app from "../app.js";

vi.mock("@workspace/db", () => ({
  WalletModel: {
    findOne: vi.fn(),
    create: vi.fn(),
    find: vi.fn().mockReturnValue({ sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }) }),
    aggregate: vi.fn().mockResolvedValue([]),
  },
  TransactionModel: {
    find: vi.fn().mockReturnValue({ sort: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }) }) }),
    countDocuments: vi.fn().mockResolvedValue(0),
  },
}));

vi.mock("../lib/queue.js", () => ({
  scheduleWalletPolling: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../lib/cache.js", () => ({
  getCached: vi.fn().mockResolvedValue(null),
  setCached: vi.fn().mockResolvedValue(undefined),
  invalidateWalletsList: vi.fn().mockResolvedValue(undefined),
}));

describe("GET /api/healthz", () => {
  it("returns 200 with status ok", async () => {
    const res = await request(app).get("/api/healthz").expect(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});

describe("GET /api/wallet/:address", () => {
  it("returns 400 for invalid Solana address", async () => {
    const res = await request(app)
      .get("/api/wallet/invalid-address")
      .expect(400);

    expect(res.body).toEqual({ error: "Invalid Solana wallet address" });
  });

  it("returns 400 for invalid base58", async () => {
    const res = await request(app)
      .get("/api/wallet/notabase58!!!")
      .expect(400);
    expect(res.body.error).toContain("Invalid");
  });
});

describe("GET /api/wallet/:address/balances", () => {
  it("returns 400 for invalid Solana address", async () => {
    const res = await request(app)
      .get("/api/wallet/bad/balances")
      .expect(400);
    expect(res.body).toEqual({ error: "Invalid Solana wallet address" });
  });
});

describe("POST /api/wallet", () => {
  it("returns 400 when address is missing", async () => {
    const res = await request(app)
      .post("/api/wallet")
      .send({})
      .expect(400);

    expect(res.body).toEqual({ error: "Wallet address is required" });
  });

  it("returns 400 when address is not a string", async () => {
    const res = await request(app)
      .post("/api/wallet")
      .send({ address: 123 })
      .expect(400);

    expect(res.body).toEqual({ error: "Wallet address is required" });
  });

  it("returns 400 for invalid Solana address", async () => {
    const res = await request(app)
      .post("/api/wallet")
      .send({ address: "not-valid-base58!!!" })
      .expect(400);

    expect(res.body).toEqual({ error: "Invalid Solana wallet address" });
  });
});
