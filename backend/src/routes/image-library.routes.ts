import { Router, Request, Response, NextFunction } from 'express';
import { imageEntityService, CreateImageEntityData } from '../services/image-entity.service';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

/**
 * POST /api/image-library
 * Create a new image record
 */
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data: CreateImageEntityData = req.body;

    if (!data.url) {
      res.status(400).json({ success: false, error: 'url is required' });
      return;
    }

    if (!data.source || !['pinterest', 'upload'].includes(data.source)) {
      res.status(400).json({ success: false, error: 'source must be "pinterest" or "upload"' });
      return;
    }

    data.userId = req.user!.userId;

    const image = await imageEntityService.create(data);
    res.status(201).json({ success: true, data: image });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/image-library/batch
 * Create multiple image records at once
 */
router.post('/batch', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { images } = req.body as { images: CreateImageEntityData[] };

    if (!Array.isArray(images) || images.length === 0) {
      res.status(400).json({ success: false, error: 'images array is required' });
      return;
    }

    // Validate each image and attach userId
    const validatedImages = images.map((img) => {
      if (!img.url || !img.source) {
        throw new Error('Each image must have url and source');
      }
      return {
        ...img,
        userId: req.user!.userId,
      };
    });

    const created = await imageEntityService.createMany(validatedImages);
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    if (error instanceof Error && error.message.includes('must have')) {
      res.status(400).json({ success: false, error: error.message });
      return;
    }
    next(error);
  }
});

/**
 * GET /api/image-library
 * List user's images with pagination
 */
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    const result = await imageEntityService.list(req.user!.userId, page, limit);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/image-library/:id
 * Get a specific image
 */
router.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const image = await imageEntityService.getById(id);

    if (!image) {
      res.status(404).json({ success: false, error: 'Image not found' });
      return;
    }

    if (image.userId !== req.user!.userId) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    res.json({ success: true, data: image });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/image-library/:id
 * Delete an image
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Check ownership
    const isOwner = await imageEntityService.isOwner(id, req.user!.userId);
    if (!isOwner) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    await imageEntityService.delete(id);
    res.json({ success: true, message: 'Image deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
