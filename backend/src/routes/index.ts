import { Router } from 'express';
import planRoutes from './plan.routes';
import imageRoutes from './image.routes';
import pinterestRoutes from './pinterest.routes';
import tiktokRoutes from './tiktok.routes';
import slideshowRoutes from './slideshow.routes';
import settingsRoutes from './settings.routes';

const router = Router();

router.use('/generate-plan', planRoutes);
router.use('/generate-image', imageRoutes);
router.use('/pinterest', pinterestRoutes);
router.use('/tiktok', tiktokRoutes);
router.use('/slideshows', slideshowRoutes);
router.use('/settings', settingsRoutes);

// Health check
router.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
