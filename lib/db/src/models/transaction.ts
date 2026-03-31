import mongoose, { Document, Schema } from "mongoose";

export interface ITransaction {
  signature: string;
  walletAddress: string;
  slot: number | null;
  blockTime: number | null;
  fee: number | null;
  status: string;
  raw: Record<string, unknown> | null;
  createdAt: Date;
}

export interface ITransactionDoc extends ITransaction, Document {}

const transactionSchema = new Schema<ITransactionDoc>(
  {
    signature: { type: String, required: true, unique: true },
    walletAddress: { type: String, required: true, index: true },
    slot: { type: Number, default: null },
    blockTime: { type: Number, default: null },
    fee: { type: Number, default: null },
    status: { type: String, required: true, default: "success" },
    raw: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } },
);

transactionSchema.index({ walletAddress: 1, slot: -1 });

export const TransactionModel =
  (mongoose.models.Transaction as mongoose.Model<ITransactionDoc>) ||
  mongoose.model<ITransactionDoc>("Transaction", transactionSchema);
