import { Router, Request, Response, NextFunction } from 'express';
import {
  templateService,
  CreateTemplateData,
  CreateFromTikTokOptions,
  CreateFromPromptOptions,
  CreateFromScratchOptions,
} from '../services/template.service';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

/**
 * POST /api/templates
 * Create a new template directly
 */
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data: CreateTemplateData = req.body;

    if (!data.name || !data.name.trim()) {
      res.status(400).json({ success: false, error: 'name is required' });
      return;
    }

    data.userId = req.user!.userId;

    const template = await templateService.create(data);
    res.status(201).json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/templates/from-tiktok
 * Create a template by importing from TikTok
 */
router.post(
  '/from-tiktok',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tiktokUrl, fetchPinterestImages = true } = req.body;

      if (!tiktokUrl || !tiktokUrl.trim()) {
        res.status(400).json({ success: false, error: 'tiktokUrl is required' });
        return;
      }

      if (!tiktokUrl.includes('tiktok.com')) {
        res.status(400).json({ success: false, error: 'Invalid TikTok URL' });
        return;
      }

      const options: CreateFromTikTokOptions = {
        userId: req.user!.userId,
        tiktokUrl,
        fetchPinterestImages,
      };

      const template = await templateService.createFromTikTok(options);
      res.status(201).json({ success: true, data: template });
    } catch (error) {
      console.error('Create from TikTok error:', error);
      next(error);
    }
  }
);

/**
 * POST /api/templates/from-prompt
 * Create a template from an AI prompt
 */
router.post(
  '/from-prompt',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { prompt, slideCount = 5, fetchPinterestImages = true } = req.body;

      if (!prompt || !prompt.trim()) {
        res.status(400).json({ success: false, error: 'prompt is required' });
        return;
      }

      const validSlideCount = Math.min(Math.max(parseInt(slideCount) || 5, 1), 20);

      const options: CreateFromPromptOptions = {
        userId: req.user!.userId,
        prompt,
        slideCount: validSlideCount,
        fetchPinterestImages,
      };

      const template = await templateService.createFromPrompt(options);
      res.status(201).json({ success: true, data: template });
    } catch (error) {
      console.error('Create from prompt error:', error);
      next(error);
    }
  }
);

/**
 * POST /api/templates/from-scratch
 * Create a blank template
 */
router.post(
  '/from-scratch',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, slideCount = 5 } = req.body;

      if (!name || !name.trim()) {
        res.status(400).json({ success: false, error: 'name is required' });
        return;
      }

      const validSlideCount = Math.min(Math.max(parseInt(slideCount) || 5, 1), 20);

      const options: CreateFromScratchOptions = {
        userId: req.user!.userId,
        name,
        slideCount: validSlideCount,
      };

      const template = await templateService.createFromScratch(options);
      res.status(201).json({ success: true, data: template });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/templates
 * List user's templates with pagination
 */
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const result = await templateService.list(req.user!.userId, page, limit);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/templates/:id
 * Get a specific template
 */
router.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Check ownership
    const isOwner = await templateService.isOwner(id, req.user!.userId);
    if (!isOwner) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    const template = await templateService.getById(id);
    if (!template) {
      res.status(404).json({ success: false, error: 'Template not found' });
      return;
    }

    res.json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/templates/:id
 * Update a template
 */
router.put('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data: Partial<CreateTemplateData> = req.body;

    // Check ownership
    const isOwner = await templateService.isOwner(id, req.user!.userId);
    if (!isOwner) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    const template = await templateService.update(id, data);
    if (!template) {
      res.status(404).json({ success: false, error: 'Template not found' });
      return;
    }

    res.json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/templates/:id/slides/:slideId
 * Update a specific slide in a template
 */
router.put(
  '/:id/slides/:slideId',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, slideId } = req.params;
      const slideData = req.body;

      // Check ownership
      const isOwner = await templateService.isOwner(id, req.user!.userId);
      if (!isOwner) {
        res.status(403).json({ success: false, error: 'Access denied' });
        return;
      }

      const template = await templateService.updateSlide(id, slideId, slideData);
      if (!template) {
        res.status(404).json({ success: false, error: 'Template or slide not found' });
        return;
      }

      res.json({ success: true, data: template });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/templates/:id/slides
 * Add a new slide to a template
 */
router.post('/:id/slides', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const slideData = req.body;

    // Check ownership
    const isOwner = await templateService.isOwner(id, req.user!.userId);
    if (!isOwner) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    const template = await templateService.addSlide(id, slideData);
    if (!template) {
      res.status(404).json({ success: false, error: 'Template not found' });
      return;
    }

    res.json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/templates/:id/slides/:slideId
 * Remove a slide from a template
 */
router.delete(
  '/:id/slides/:slideId',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, slideId } = req.params;

      // Check ownership
      const isOwner = await templateService.isOwner(id, req.user!.userId);
      if (!isOwner) {
        res.status(403).json({ success: false, error: 'Access denied' });
        return;
      }

      const template = await templateService.removeSlide(id, slideId);
      if (!template) {
        res.status(404).json({ success: false, error: 'Template or slide not found' });
        return;
      }

      res.json({ success: true, data: template });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/templates/:id/slides/reorder
 * Reorder slides in a template
 */
router.put(
  '/:id/slides/reorder',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { slideIds } = req.body as { slideIds: string[] };

      if (!Array.isArray(slideIds)) {
        res.status(400).json({ success: false, error: 'slideIds array is required' });
        return;
      }

      // Check ownership
      const isOwner = await templateService.isOwner(id, req.user!.userId);
      if (!isOwner) {
        res.status(403).json({ success: false, error: 'Access denied' });
        return;
      }

      const template = await templateService.reorderSlides(id, slideIds);
      if (!template) {
        res.status(404).json({ success: false, error: 'Template not found' });
        return;
      }

      res.json({ success: true, data: template });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/templates/:id
 * Delete a template
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Check ownership
    const isOwner = await templateService.isOwner(id, req.user!.userId);
    if (!isOwner) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    await templateService.delete(id);
    res.json({ success: true, message: 'Template deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
