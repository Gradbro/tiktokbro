import { Router, Request, Response, NextFunction } from 'express';
import { collectionService, CreateCollectionData } from '../services/collection.service';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

/**
 * POST /api/collections
 * Create a new collection
 */
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data: CreateCollectionData = req.body;

    if (!data.name || !data.name.trim()) {
      res.status(400).json({ success: false, error: 'name is required' });
      return;
    }

    data.userId = req.user!.userId;

    const collection = await collectionService.create(data);
    res.status(201).json({ success: true, data: collection });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/collections
 * List user's collections with pagination
 */
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const result = await collectionService.list(req.user!.userId, page, limit);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/collections/:id
 * Get a collection with its images
 */
router.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Check ownership
    const isOwner = await collectionService.isOwner(id, req.user!.userId);
    if (!isOwner) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    const collection = await collectionService.getByIdWithImages(id);
    if (!collection) {
      res.status(404).json({ success: false, error: 'Collection not found' });
      return;
    }

    res.json({ success: true, data: collection });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/collections/:id
 * Update collection metadata (name, description)
 */
router.put('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, description, thumbnailUrl } = req.body;

    // Check ownership
    const isOwner = await collectionService.isOwner(id, req.user!.userId);
    if (!isOwner) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    const collection = await collectionService.update(id, { name, description, thumbnailUrl });
    if (!collection) {
      res.status(404).json({ success: false, error: 'Collection not found' });
      return;
    }

    res.json({ success: true, data: collection });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/collections/:id/images
 * Add images to a collection
 */
router.post('/:id/images', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { imageIds } = req.body as { imageIds: string[] };

    if (!Array.isArray(imageIds) || imageIds.length === 0) {
      res.status(400).json({ success: false, error: 'imageIds array is required' });
      return;
    }

    // Check ownership
    const isOwner = await collectionService.isOwner(id, req.user!.userId);
    if (!isOwner) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    const collection = await collectionService.addImages(id, imageIds);
    if (!collection) {
      res.status(404).json({ success: false, error: 'Collection not found' });
      return;
    }

    // Update thumbnail if this is the first image
    if (!collection.thumbnailUrl) {
      await collectionService.updateThumbnail(id);
    }

    res.json({ success: true, data: collection });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/collections/:id/images
 * Remove images from a collection
 */
router.delete(
  '/:id/images',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { imageIds } = req.body as { imageIds: string[] };

      if (!Array.isArray(imageIds) || imageIds.length === 0) {
        res.status(400).json({ success: false, error: 'imageIds array is required' });
        return;
      }

      // Check ownership
      const isOwner = await collectionService.isOwner(id, req.user!.userId);
      if (!isOwner) {
        res.status(403).json({ success: false, error: 'Access denied' });
        return;
      }

      const collection = await collectionService.removeImages(id, imageIds);
      if (!collection) {
        res.status(404).json({ success: false, error: 'Collection not found' });
        return;
      }

      res.json({ success: true, data: collection });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/collections/:id/random
 * Get a random image from a collection
 */
router.get('/:id/random', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Check ownership
    const isOwner = await collectionService.isOwner(id, req.user!.userId);
    if (!isOwner) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    const image = await collectionService.getRandomImage(id);
    if (!image) {
      res.status(404).json({ success: false, error: 'Collection is empty or not found' });
      return;
    }

    res.json({ success: true, data: image });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/collections/:id
 * Delete a collection (does not delete images)
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Check ownership
    const isOwner = await collectionService.isOwner(id, req.user!.userId);
    if (!isOwner) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    await collectionService.delete(id);
    res.json({ success: true, message: 'Collection deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
