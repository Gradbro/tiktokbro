import { Router } from 'express';
import planRoutes from './plan.routes';
import imageRoutes from './image.routes';
import pinterestRoutes from './pinterest.routes';
import tiktokRoutes from './tiktok.routes';
import slideshowRoutes from './slideshow.routes';
import settingsRoutes from './settings.routes';
import reactionRoutes from './reaction.routes';
import ugcReactionRoutes from './ugc-reaction.routes';
import authRoutes from './auth.routes';
import imageLibraryRoutes from './image-library.routes';
import collectionRoutes from './collection.routes';
import productRoutes from './product.routes';
import templateRoutes from './template.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/generate-plan', planRoutes);
router.use('/generate-image', imageRoutes);
router.use('/pinterest', pinterestRoutes);
router.use('/tiktok', tiktokRoutes);
router.use('/slideshows', slideshowRoutes);
router.use('/settings', settingsRoutes);
router.use('/reactions', reactionRoutes);
router.use('/ugc-reactions', ugcReactionRoutes);
router.use('/image-library', imageLibraryRoutes);
router.use('/collections', collectionRoutes);
router.use('/products', productRoutes);
router.use('/templates', templateRoutes);

// Health check
router.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
