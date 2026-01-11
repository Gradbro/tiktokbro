import { Collection, ICollection } from '../models/collection.model';
import { Image, IImage } from '../models/image.model';
import { Types } from 'mongoose';

export interface CreateCollectionData {
  userId: string;
  name: string;
  description?: string;
  imageIds?: string[];
  thumbnailUrl?: string;
}

export interface CollectionListItem {
  id: string;
  name: string;
  description?: string;
  imageCount: number;
  thumbnailUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CollectionWithImages {
  id: string;
  name: string;
  description?: string;
  images: Array<{
    id: string;
    url: string;
    source: string;
    pinterestPinUrl?: string;
  }>;
  thumbnailUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

class CollectionService {
  /**
   * Create a new collection
   */
  async create(data: CreateCollectionData): Promise<ICollection> {
    const collection = new Collection({
      ...data,
      imageIds: data.imageIds?.map((id) => new Types.ObjectId(id)) || [],
    });
    return collection.save();
  }

  /**
   * Get a collection by ID
   */
  async getById(id: string): Promise<ICollection | null> {
    return Collection.findById(id);
  }

  /**
   * Get a collection with populated images
   */
  async getByIdWithImages(id: string): Promise<CollectionWithImages | null> {
    const collection = await Collection.findById(id).lean();
    if (!collection) {
      return null;
    }

    const images = await Image.find({ _id: { $in: collection.imageIds } })
      .select('url source pinterestPinUrl')
      .lean();

    return {
      id: collection._id.toString(),
      name: collection.name,
      description: collection.description,
      images: images.map((img) => ({
        id: img._id.toString(),
        url: img.url,
        source: img.source,
        pinterestPinUrl: img.pinterestPinUrl,
      })),
      thumbnailUrl: collection.thumbnailUrl,
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
    };
  }

  /**
   * List collections for a user with pagination
   */
  async list(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ collections: CollectionListItem[]; total: number; pages: number }> {
    const skip = (page - 1) * limit;

    const [collections, total] = await Promise.all([
      Collection.find({ userId })
        .select('name description imageIds thumbnailUrl createdAt updatedAt')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Collection.countDocuments({ userId }),
    ]);

    return {
      collections: collections.map((c) => ({
        id: c._id.toString(),
        name: c.name,
        description: c.description,
        imageCount: c.imageIds?.length || 0,
        thumbnailUrl: c.thumbnailUrl,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
      total,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Update a collection
   */
  async update(
    id: string,
    data: Partial<Pick<CreateCollectionData, 'name' | 'description' | 'thumbnailUrl'>>
  ): Promise<ICollection | null> {
    return Collection.findByIdAndUpdate(id, { $set: data }, { new: true });
  }

  /**
   * Add images to a collection
   */
  async addImages(id: string, imageIds: string[]): Promise<ICollection | null> {
    const objectIds = imageIds.map((imgId) => new Types.ObjectId(imgId));
    return Collection.findByIdAndUpdate(
      id,
      { $addToSet: { imageIds: { $each: objectIds } } },
      { new: true }
    );
  }

  /**
   * Remove images from a collection
   */
  async removeImages(id: string, imageIds: string[]): Promise<ICollection | null> {
    const objectIds = imageIds.map((imgId) => new Types.ObjectId(imgId));
    return Collection.findByIdAndUpdate(
      id,
      { $pull: { imageIds: { $in: objectIds } } },
      { new: true }
    );
  }

  /**
   * Set the thumbnail URL (typically first image)
   */
  async updateThumbnail(id: string): Promise<ICollection | null> {
    const collection = await Collection.findById(id).lean();
    if (!collection || !collection.imageIds?.length) {
      return null;
    }

    const firstImage = await Image.findById(collection.imageIds[0]).select('url').lean();
    if (!firstImage) {
      return null;
    }

    return Collection.findByIdAndUpdate(
      id,
      { $set: { thumbnailUrl: firstImage.url } },
      { new: true }
    );
  }

  /**
   * Delete a collection (does not delete images)
   */
  async delete(id: string): Promise<boolean> {
    const result = await Collection.deleteOne({ _id: id });
    return result.deletedCount === 1;
  }

  /**
   * Check if user owns collection
   */
  async isOwner(collectionId: string, userId: string): Promise<boolean> {
    const collection = await Collection.findById(collectionId).select('userId').lean();
    return collection?.userId === userId;
  }

  /**
   * Get random image from collection
   */
  async getRandomImage(
    collectionId: string
  ): Promise<{ id: string; url: string; source: string } | null> {
    const collection = await Collection.findById(collectionId).select('imageIds').lean();
    if (!collection || !collection.imageIds?.length) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * collection.imageIds.length);
    const randomImageId = collection.imageIds[randomIndex];

    const image = await Image.findById(randomImageId).select('url source').lean();
    if (!image) {
      return null;
    }

    return {
      id: image._id.toString(),
      url: image.url,
      source: image.source,
    };
  }
}

export const collectionService = new CollectionService();
