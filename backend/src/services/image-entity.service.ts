import { Image, IImage } from '../models/image.model';

export interface CreateImageEntityData {
  userId: string;
  url: string;
  source: 'pinterest' | 'upload';
  pinterestPinUrl?: string;
  filename?: string;
  mimeType?: string;
  size?: number;
}

export interface ImageEntityListItem {
  id: string;
  url: string;
  source: 'pinterest' | 'upload';
  pinterestPinUrl?: string;
  filename?: string;
  createdAt: Date;
}

class ImageEntityService {
  /**
   * Create a new image record
   */
  async create(data: CreateImageEntityData): Promise<IImage> {
    const image = new Image(data);
    return image.save();
  }

  /**
   * Create multiple image records at once
   */
  async createMany(images: CreateImageEntityData[]): Promise<IImage[]> {
    return Image.insertMany(images);
  }

  /**
   * Get an image by ID
   */
  async getById(id: string): Promise<IImage | null> {
    return Image.findById(id);
  }

  /**
   * Get multiple images by IDs
   */
  async getByIds(ids: string[]): Promise<IImage[]> {
    return Image.find({ _id: { $in: ids } });
  }

  /**
   * List images for a user with pagination
   */
  async list(
    userId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ images: ImageEntityListItem[]; total: number; pages: number }> {
    const skip = (page - 1) * limit;

    const [images, total] = await Promise.all([
      Image.find({ userId })
        .select('url source pinterestPinUrl filename createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Image.countDocuments({ userId }),
    ]);

    return {
      images: images.map((img) => ({
        id: img._id.toString(),
        url: img.url,
        source: img.source,
        pinterestPinUrl: img.pinterestPinUrl,
        filename: img.filename,
        createdAt: img.createdAt,
      })),
      total,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Delete an image
   */
  async delete(id: string): Promise<boolean> {
    const result = await Image.deleteOne({ _id: id });
    return result.deletedCount === 1;
  }

  /**
   * Delete multiple images
   */
  async deleteMany(ids: string[]): Promise<number> {
    const result = await Image.deleteMany({ _id: { $in: ids } });
    return result.deletedCount;
  }

  /**
   * Check if user owns image
   */
  async isOwner(imageId: string, userId: string): Promise<boolean> {
    const image = await Image.findById(imageId).select('userId').lean();
    return image?.userId === userId;
  }
}

export const imageEntityService = new ImageEntityService();
