import { pgTable, text, serial, timestamp, integer, bigint, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  signature: text("signature").notNull().unique(),
  walletAddress: text("wallet_address").notNull(),
  slot: bigint("slot", { mode: "number" }),
  blockTime: bigint("block_time", { mode: "number" }),
  fee: integer("fee"),
  status: text("status").notNull().default("success"),
  raw: jsonb("raw"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({ id: true, createdAt: true });
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;
