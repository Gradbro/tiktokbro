import { Schema, model, Document } from 'mongoose';

export interface ISettings extends Document {
  key: string;
  productContext: string;
  createdAt: Date;
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>(
  {
    key: { type: String, required: true, unique: true, default: 'global' },
    productContext: { type: String, default: '' },
  },
  {
    timestamps: true,
  }
);

export const Settings = model<ISettings>('Settings', SettingsSchema);
