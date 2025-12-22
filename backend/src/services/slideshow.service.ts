import { SlideshowSession, ISlideshowSession } from '../models/slideshow.model';

export interface SlideshowSessionData {
  sessionId: string;
  name?: string;
  prompt: string;
  stage: string;
  plans: Array<{
    slideNumber: number;
    imagePrompt: string;
    suggestedOverlay?: string;
  }>;
  slides: Array<{
    id: string;
    slideNumber: number;
    plan: {
      slideNumber: number;
      imagePrompt: string;
      suggestedOverlay?: string;
    };
    imageData?: string;
    // editedImageData regenerated at runtime from imageData + textOverlay
    status: 'pending' | 'generating' | 'complete' | 'error';
    error?: string;
    textOverlay?: {
      text: string;
      size: 'small' | 'medium' | 'large';
      color: string;
      position: { x: number; y: number };
    };
  }>;
  config: {
    aspectRatio: '9:16' | '1:1' | '16:9';
    model: 'imagen-4.0-generate-001' | 'imagen-4.0-fast-generate-001';
    slideCount: number;
  };
  tiktokData?: {
    originalUrl: string;
    caption: string;
    slides: Array<{ index: number; imageUrl: string }>;
    authorName?: string;
  };
  slideAnalyses?: Array<{
    index: number;
    imageDescription: string;
    backgroundType: string;
    backgroundStyle: string;
    extractedText: string;
    textPlacement: string;
  }>;
  remixPlans?: Array<{
    slideNumber: number;
    pinterestQuery: string;
    newOverlayText: string;
    layoutNotes: string;
    pinterestCandidates?: Array<{
      imageUrl: string;
      pinUrl?: string;
      title?: string;
    }>;
    selectedImageUrl?: string;
    textPosition?: { x: number; y: number };
  }>;
  productContext?: string;
}

export interface SlideshowListItem {
  sessionId: string;
  name: string;
  prompt: string;
  stage: string;
  slideCount: number;
  createdAt: Date;
  updatedAt: Date;
}

class SlideshowService {
  /**
   * Create a new slideshow session
   */
  async create(data: SlideshowSessionData): Promise<ISlideshowSession> {
    const session = new SlideshowSession({
      ...data,
      name: data.name || this.generateName(data),
    });
    return session.save();
  }

  /**
   * Get a slideshow session by sessionId
   */
  async getById(sessionId: string): Promise<ISlideshowSession | null> {
    return SlideshowSession.findOne({ sessionId });
  }

  /**
   * Update an existing slideshow session
   */
  async update(
    sessionId: string,
    data: Partial<SlideshowSessionData>
  ): Promise<ISlideshowSession | null> {
    // If name is "Untitled Slideshow", try to generate a better one from new data
    const existing = await this.getById(sessionId);
    if (existing && existing.name === 'Untitled Slideshow') {
      const mergedData = {
        ...existing.toObject(),
        ...data,
      } as SlideshowSessionData;
      const generatedName = this.generateName(mergedData);
      if (generatedName !== 'Untitled Slideshow') {
        data.name = generatedName;
      }
    }

    return SlideshowSession.findOneAndUpdate({ sessionId }, { $set: data }, { new: true });
  }

  /**
   * Delete a slideshow session
   */
  async delete(sessionId: string): Promise<boolean> {
    const result = await SlideshowSession.deleteOne({ sessionId });
    return result.deletedCount === 1;
  }

  /**
   * List all slideshow sessions (with pagination)
   */
  async list(
    page: number = 1,
    limit: number = 20
  ): Promise<{ sessions: SlideshowListItem[]; total: number; pages: number }> {
    const skip = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      SlideshowSession.find()
        .select('sessionId name prompt stage slides createdAt updatedAt')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SlideshowSession.countDocuments(),
    ]);

    return {
      sessions: sessions.map((s) => ({
        sessionId: s.sessionId,
        name: s.name,
        prompt: s.prompt,
        stage: s.stage,
        slideCount: s.slides?.length || 0,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
      total,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Search slideshows by name or prompt
   */
  async search(query: string, limit: number = 10): Promise<SlideshowListItem[]> {
    const sessions = await SlideshowSession.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { prompt: { $regex: query, $options: 'i' } },
      ],
    })
      .select('sessionId name prompt stage slides createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean();

    return sessions.map((s) => ({
      sessionId: s.sessionId,
      name: s.name,
      prompt: s.prompt,
      stage: s.stage,
      slideCount: s.slides?.length || 0,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));
  }

  /**
   * Generate a name from available data
   */
  private generateName(data: SlideshowSessionData): string {
    // Priority 1: Use prompt if available
    if (data.prompt && data.prompt.trim()) {
      const name = data.prompt.slice(0, 50).trim();
      return name.length < data.prompt.length ? `${name}...` : name;
    }

    // Priority 2: Use TikTok author name if available
    if (data.tiktokData?.authorName) {
      return `Remix: @${data.tiktokData.authorName}`;
    }

    // Priority 3: Use TikTok caption if available
    if (data.tiktokData?.caption) {
      const caption = data.tiktokData.caption.slice(0, 50).trim();
      return caption.length < data.tiktokData.caption.length ? `${caption}...` : caption;
    }

    // Priority 4: Use first remix plan overlay text
    if (data.remixPlans && data.remixPlans.length > 0) {
      const firstText = data.remixPlans[0].newOverlayText;
      if (firstText) {
        const name = firstText.slice(0, 50).trim();
        return name.length < firstText.length ? `${name}...` : name;
      }
    }

    // Fallback
    return 'Untitled Slideshow';
  }

  /**
   * Duplicate an existing slideshow
   */
  async duplicate(sessionId: string, newSessionId: string): Promise<ISlideshowSession | null> {
    const original = await this.getById(sessionId);
    if (!original) {
      return null;
    }

    const duplicateData: SlideshowSessionData = {
      sessionId: newSessionId,
      name: `${original.name} (Copy)`,
      prompt: original.prompt,
      stage: original.stage,
      plans: original.plans,
      slides: original.slides.map((slide) => ({
        ...slide,
        id: `${slide.id}-copy`,
      })),
      config: original.config,
      tiktokData: original.tiktokData,
      slideAnalyses: original.slideAnalyses,
      remixPlans: original.remixPlans,
    };

    return this.create(duplicateData);
  }
}

export const slideshowService = new SlideshowService();
