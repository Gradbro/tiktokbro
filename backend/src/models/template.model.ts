import { Schema, model, Document, Types } from 'mongoose';

// Sub-schemas for embedded objects
const TemplateTextBoxSchema = new Schema(
  {
    id: { type: String, required: true },
    defaultText: { type: String, required: true },
    variableName: { type: String, required: true },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    fontSize: { type: Number, default: 24 },
    fontFamily: { type: String, default: 'Inter, system-ui, sans-serif' },
    color: { type: String, default: '#ffffff' },
    backgroundColor: { type: String, default: null },
    textAlign: { type: String, enum: ['left', 'center', 'right'], default: 'center' },
  },
  { _id: false }
);

const TemplateSlideSchema = new Schema(
  {
    id: { type: String, required: true },
    position: { type: Number, required: true },
    width: { type: Number, default: 1080 },
    height: { type: Number, default: 1920 },
    backgroundCollectionId: { type: Schema.Types.ObjectId, ref: 'Collection' },
    backgroundImageUrl: { type: String },
    textBoxes: [TemplateTextBoxSchema],
  },
  { _id: false }
);

const SourceSchema = new Schema(
  {
    type: { type: String, enum: ['tiktok', 'scratch', 'prompt'], required: true },
    url: { type: String },
    authorName: { type: String },
  },
  { _id: false }
);

// TypeScript interfaces
export interface ITemplateTextBox {
  id: string;
  defaultText: string;
  variableName: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  backgroundColor: string | null;
  textAlign: 'left' | 'center' | 'right';
}

export interface ITemplateSlide {
  id: string;
  position: number;
  width: number;
  height: number;
  backgroundCollectionId?: Types.ObjectId;
  backgroundImageUrl?: string;
  textBoxes: ITemplateTextBox[];
}

export interface ITemplateSource {
  type: 'tiktok' | 'scratch' | 'prompt';
  url?: string;
  authorName?: string;
}

export interface ITemplate extends Document {
  userId: string;
  name: string;
  source?: ITemplateSource;
  slides: ITemplateSlide[];
  thumbnailUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TemplateSchema = new Schema<ITemplate>(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    source: { type: SourceSchema },
    slides: [TemplateSlideSchema],
    thumbnailUrl: { type: String },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
TemplateSchema.index({ userId: 1, createdAt: -1 });
TemplateSchema.index({ userId: 1, updatedAt: -1 });
TemplateSchema.index({ name: 'text' });

export const Template = model<ITemplate>('Template', TemplateSchema);
