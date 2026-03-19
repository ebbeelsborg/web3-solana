import mongoose, { Document, Schema } from "mongoose";

export interface IWallet {
  address: string;
  createdAt: Date;
}

export interface IWalletDoc extends IWallet, Document {}

const walletSchema = new Schema<IWalletDoc>(
  {
    address: { type: String, required: true, unique: true },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

export const WalletModel =
  (mongoose.models.Wallet as mongoose.Model<IWalletDoc>) ||
  mongoose.model<IWalletDoc>("Wallet", walletSchema);
