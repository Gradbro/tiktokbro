import { Router, Request, Response, NextFunction } from 'express';
import { slideshowService, SlideshowSessionData } from '../services/slideshow.service';

const router = Router();

/**
 * POST /api/slideshows
 * Create a new slideshow session
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data: SlideshowSessionData = req.body;

    if (!data.sessionId) {
      res.status(400).json({ success: false, error: 'sessionId is required' });
      return;
    }

    if (!data.config) {
      res.status(400).json({ success: false, error: 'config is required' });
      return;
    }

    const session = await slideshowService.create(data);
    res.status(201).json({ success: true, data: session });
  } catch (error) {
    // Handle duplicate key error
    if ((error as { code?: number }).code === 11000) {
      res.status(409).json({ success: false, error: 'Session with this ID already exists' });
      return;
    }
    next(error);
  }
});

/**
 * GET /api/slideshows
 * List all slideshow sessions with pagination
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const result = await slideshowService.list(page, limit);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/slideshows/search
 * Search slideshows by name or prompt
 */
router.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = (req.query.q as string) || '';
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    if (!query.trim()) {
      res.status(400).json({ success: false, error: 'Search query is required' });
      return;
    }

    const sessions = await slideshowService.search(query, limit);
    res.json({ success: true, data: sessions });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/slideshows/:sessionId
 * Get a specific slideshow session
 */
router.get('/:sessionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    const session = await slideshowService.getById(sessionId);

    if (!session) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }

    res.json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/slideshows/:sessionId
 * Update an existing slideshow session
 */
router.put('/:sessionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    const data: Partial<SlideshowSessionData> = req.body;

    // Don't allow changing sessionId
    delete data.sessionId;

    const session = await slideshowService.update(sessionId, data);

    if (!session) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }

    res.json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/slideshows/:sessionId
 * Delete a slideshow session
 */
router.delete('/:sessionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    const deleted = await slideshowService.delete(sessionId);

    if (!deleted) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }

    res.json({ success: true, message: 'Session deleted successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/slideshows/:sessionId/duplicate
 * Duplicate an existing slideshow session
 */
router.post('/:sessionId/duplicate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    const { newSessionId } = req.body;

    if (!newSessionId) {
      res.status(400).json({ success: false, error: 'newSessionId is required' });
      return;
    }

    const session = await slideshowService.duplicate(sessionId, newSessionId);

    if (!session) {
      res.status(404).json({ success: false, error: 'Original session not found' });
      return;
    }

    res.status(201).json({ success: true, data: session });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      res.status(409).json({ success: false, error: 'Session with new ID already exists' });
      return;
    }
    next(error);
  }
});

export default router;
