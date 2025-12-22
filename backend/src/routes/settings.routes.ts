import { Router, Request, Response } from 'express';
import { Settings } from '../models/settings.model';

const router = Router();

const GLOBAL_KEY = 'global';

/**
 * GET /api/settings
 * Get global settings
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const settings = await Settings.findOne({ key: GLOBAL_KEY });

    return res.json({
      success: true,
      data: settings || { productContext: '' },
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch settings',
    });
  }
});

/**
 * PUT /api/settings
 * Update global settings
 */
router.put('/', async (req: Request, res: Response) => {
  try {
    const { productContext } = req.body;

    const settings = await Settings.findOneAndUpdate(
      { key: GLOBAL_KEY },
      { productContext },
      { new: true, upsert: true }
    );

    return res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update settings',
    });
  }
});

export default router;
