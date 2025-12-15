import { Router, Request, Response } from 'express';
import { scrapeTikTokSlideshow } from '../services/tiktok.service';
import { analyzeSlideImage } from '../services/gemini.service';

const router = Router();

/**
 * POST /api/tiktok/scrape
 * Scrape a TikTok Photo Mode slideshow URL
 */
router.post('/scrape', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'TikTok URL is required',
      });
    }

    const result = await scrapeTikTokSlideshow(url);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('TikTok scrape error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to scrape TikTok',
    });
  }
});

/**
 * POST /api/tiktok/analyze
 * Analyze scraped TikTok slides using Gemini Vision
 */
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { slides } = req.body;

    if (!slides || !Array.isArray(slides) || slides.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Slides array is required',
      });
    }

    // Analyze each slide with Gemini Vision
    const analyses = await Promise.all(
      slides.map(async (slide: { index: number; imageUrl: string }) => {
        const analysis = await analyzeSlideImage(slide.imageUrl);
        return {
          index: slide.index,
          ...analysis,
        };
      })
    );

    return res.json({
      success: true,
      data: { analyses },
    });
  } catch (error) {
    console.error('TikTok analyze error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze slides',
    });
  }
});

export default router;
