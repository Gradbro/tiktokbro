import { Schema, model, Document } from 'mongoose';

export interface IImage extends Document {
  userId: string;
  url: string;
  source: 'pinterest' | 'upload';
  pinterestPinUrl?: string;
  filename?: string;
  mimeType?: string;
  size?: number;
  createdAt: Date;
  updatedAt: Date;
}

const ImageSchema = new Schema<IImage>(
  {
    userId: { type: String, required: true, index: true },
    url: { type: String, required: true },
    source: {
      type: String,
      enum: ['pinterest', 'upload'],
      required: true,
    },
    pinterestPinUrl: { type: String },
    filename: { type: String },
    mimeType: { type: String },
    size: { type: Number },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
ImageSchema.index({ userId: 1, createdAt: -1 });
ImageSchema.index({ source: 1 });

export const Image = model<IImage>('Image', ImageSchema);
