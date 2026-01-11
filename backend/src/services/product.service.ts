import { Product, IProduct } from '../models/product.model';

export interface CreateProductData {
  userId: string;
  name: string;
  description: string;
  url?: string;
}

export interface ProductListItem {
  id: string;
  name: string;
  description: string;
  url?: string;
  createdAt: Date;
  updatedAt: Date;
}

class ProductService {
  /**
   * Create a new product
   */
  async create(data: CreateProductData): Promise<IProduct> {
    const product = new Product(data);
    return product.save();
  }

  /**
   * Get a product by ID
   */
  async getById(id: string): Promise<IProduct | null> {
    return Product.findById(id);
  }

  /**
   * List products for a user with pagination
   */
  async list(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ products: ProductListItem[]; total: number; pages: number }> {
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      Product.find({ userId })
        .select('name description url createdAt updatedAt')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments({ userId }),
    ]);

    return {
      products: products.map((p) => ({
        id: p._id.toString(),
        name: p.name,
        description: p.description,
        url: p.url,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
      total,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Update a product
   */
  async update(
    id: string,
    data: Partial<Pick<CreateProductData, 'name' | 'description' | 'url'>>
  ): Promise<IProduct | null> {
    return Product.findByIdAndUpdate(id, { $set: data }, { new: true });
  }

  /**
   * Delete a product
   */
  async delete(id: string): Promise<boolean> {
    const result = await Product.deleteOne({ _id: id });
    return result.deletedCount === 1;
  }

  /**
   * Check if user owns product
   */
  async isOwner(productId: string, userId: string): Promise<boolean> {
    const product = await Product.findById(productId).select('userId').lean();
    return product?.userId === userId;
  }

  /**
   * Search products by name or description
   */
  async search(userId: string, query: string, limit: number = 10): Promise<ProductListItem[]> {
    const products = await Product.find({
      userId,
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
      ],
    })
      .select('name description url createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean();

    return products.map((p) => ({
      id: p._id.toString(),
      name: p.name,
      description: p.description,
      url: p.url,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  }
}

export const productService = new ProductService();
