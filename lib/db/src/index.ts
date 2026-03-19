import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI must be set.");
}

let connected = false;

export async function connectDb(): Promise<void> {
  if (connected) return;
  await mongoose.connect(uri!, { dbName: "solana_tracker" });
  connected = true;
  console.log("[DB] Connected to MongoDB");
}

export * from "./models/wallet.js";
export * from "./models/transaction.js";
