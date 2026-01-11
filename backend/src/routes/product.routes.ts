import { Router, Request, Response, NextFunction } from 'express';
import { productService, CreateProductData } from '../services/product.service';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

/**
 * POST /api/products
 * Create a new product
 */
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data: CreateProductData = req.body;

    if (!data.name || !data.name.trim()) {
      res.status(400).json({ success: false, error: 'name is required' });
      return;
    }

    if (!data.description || !data.description.trim()) {
      res.status(400).json({ success: false, error: 'description is required' });
      return;
    }

    data.userId = req.user!.userId;

    const product = await productService.create(data);
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/products
 * List user's products with pagination
 */
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const result = await productService.list(req.user!.userId, page, limit);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/products/search
 * Search products by name or description
 */
router.get('/search', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = (req.query.q as string) || '';
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    if (!query.trim()) {
      res.status(400).json({ success: false, error: 'Search query is required' });
      return;
    }

    const products = await productService.search(req.user!.userId, query, limit);
    res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/products/:id
 * Get a specific product
 */
router.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Check ownership
    const isOwner = await productService.isOwner(id, req.user!.userId);
    if (!isOwner) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    const product = await productService.getById(id);
    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/products/:id
 * Update a product
 */
router.put('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, description, url } = req.body;

    // Check ownership
    const isOwner = await productService.isOwner(id, req.user!.userId);
    if (!isOwner) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    const product = await productService.update(id, { name, description, url });
    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/products/:id
 * Delete a product
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Check ownership
    const isOwner = await productService.isOwner(id, req.user!.userId);
    if (!isOwner) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    await productService.delete(id);
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
