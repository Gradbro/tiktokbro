import { Router, Request, Response } from 'express';
import { PinterestScraper } from '../services/pinterest.service';

const router = Router();

/**
 * POST /api/pinterest/search
 * Search Pinterest for images
 */
router.post('/search', async (req: Request, res: Response) => {
  try {
    const { query, limit = 20 } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required',
      });
    }

    const scraper = new PinterestScraper({ sleepTime: 300 });
    const urls = await scraper.search(query, limit);

    return res.json({
      success: true,
      data: {
        query,
        urls,
        count: urls.length,
      },
    });
  } catch (error) {
    console.error('Pinterest search error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Search failed',
    });
  }
});

/**
 * GET /api/pinterest/board/:username/:board
 * Get images from a Pinterest board
 */
router.get('/board/:username/:board', async (req: Request, res: Response) => {
  try {
    const { username, board } = req.params;

    if (!username || !board) {
      return res.status(400).json({
        success: false,
        error: 'Username and board are required',
      });
    }

    const scraper = new PinterestScraper();
    const details = await scraper.getPinDetails(username, board);

    return res.json({
      success: true,
      data: details,
    });
  } catch (error) {
    console.error('Pinterest board error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch board',
    });
  }
});

export default router;
