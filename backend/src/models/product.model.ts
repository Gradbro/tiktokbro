import { Schema, model, Document } from 'mongoose';

export interface IProduct extends Document {
  userId: string;
  name: string;
  description: string;
  url?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    url: { type: String },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
ProductSchema.index({ userId: 1, createdAt: -1 });
ProductSchema.index({ userId: 1, name: 1 });
ProductSchema.index({ name: 'text', description: 'text' });

export const Product = model<IProduct>('Product', ProductSchema);
