import { Schema, model, Document, Types } from 'mongoose';

export interface ICollection extends Document {
  userId: string;
  name: string;
  description?: string;
  imageIds: Types.ObjectId[];
  thumbnailUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CollectionSchema = new Schema<ICollection>(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    imageIds: [{ type: Schema.Types.ObjectId, ref: 'Image' }],
    thumbnailUrl: { type: String },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
CollectionSchema.index({ userId: 1, createdAt: -1 });
CollectionSchema.index({ userId: 1, name: 1 });

export const Collection = model<ICollection>('Collection', CollectionSchema);
