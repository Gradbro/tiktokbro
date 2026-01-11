import { Template, ITemplate, ITemplateSlide } from '../models/template.model';
import { Collection } from '../models/collection.model';
import { Image } from '../models/image.model';
import { scrapeTikTokSlideshow } from './tiktok.service';
import { createPinterestScraper } from './pinterest.service';
import { generateCreatePlan, RemixPlan } from './plan.service';
import { analyzeSlides } from './slide-analysis.service';
import { generateRemixPlan } from './plan.service';
import { Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const IMAGES_PER_COLLECTION = 25;

export interface CreateTemplateData {
  userId: string;
  name: string;
  source?: {
    type: 'tiktok' | 'scratch' | 'prompt';
    url?: string;
    authorName?: string;
  };
  slides?: ITemplateSlide[];
  thumbnailUrl?: string;
}

export interface TemplateListItem {
  id: string;
  name: string;
  source?: {
    type: string;
    authorName?: string;
  };
  slideCount: number;
  thumbnailUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFromTikTokOptions {
  userId: string;
  tiktokUrl: string;
  fetchPinterestImages?: boolean;
}

export interface CreateFromPromptOptions {
  userId: string;
  prompt: string;
  slideCount: number;
  fetchPinterestImages?: boolean;
}

export interface CreateFromScratchOptions {
  userId: string;
  name: string;
  slideCount: number;
}

class TemplateService {
  /**
   * Create a template directly with data
   */
  async create(data: CreateTemplateData): Promise<ITemplate> {
    const template = new Template(data);
    return template.save();
  }

  /**
   * Get a template by ID
   */
  async getById(id: string): Promise<ITemplate | null> {
    return Template.findById(id);
  }

  /**
   * List templates for a user with pagination
   */
  async list(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ templates: TemplateListItem[]; total: number; pages: number }> {
    const skip = (page - 1) * limit;

    const [templates, total] = await Promise.all([
      Template.find({ userId })
        .select('name source slides thumbnailUrl createdAt updatedAt')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Template.countDocuments({ userId }),
    ]);

    return {
      templates: templates.map((t) => ({
        id: t._id.toString(),
        name: t.name,
        source: t.source
          ? {
              type: t.source.type,
              authorName: t.source.authorName,
            }
          : undefined,
        slideCount: t.slides?.length || 0,
        thumbnailUrl: t.thumbnailUrl,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
      total,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Update a template
   */
  async update(id: string, data: Partial<CreateTemplateData>): Promise<ITemplate | null> {
    // Don't allow changing userId
    delete data.userId;
    return Template.findByIdAndUpdate(id, { $set: data }, { new: true });
  }

  /**
   * Update a single slide in a template
   */
  async updateSlide(
    templateId: string,
    slideId: string,
    slideData: Partial<ITemplateSlide>
  ): Promise<ITemplate | null> {
    const template = await Template.findById(templateId);
    if (!template) {
      return null;
    }

    const slideIndex = template.slides.findIndex((s) => s.id === slideId);
    if (slideIndex === -1) {
      return null;
    }

    // Update the slide
    Object.assign(template.slides[slideIndex], slideData);
    return template.save();
  }

  /**
   * Add a slide to a template
   */
  async addSlide(
    templateId: string,
    slideData?: Partial<ITemplateSlide>
  ): Promise<ITemplate | null> {
    const template = await Template.findById(templateId);
    if (!template) {
      return null;
    }

    const newPosition = template.slides.length;
    const newSlide: ITemplateSlide = {
      id: uuidv4(),
      position: newPosition,
      width: 1080,
      height: 1920,
      textBoxes: [],
      ...slideData,
    };

    template.slides.push(newSlide);
    return template.save();
  }

  /**
   * Remove a slide from a template
   */
  async removeSlide(templateId: string, slideId: string): Promise<ITemplate | null> {
    const template = await Template.findById(templateId);
    if (!template) {
      return null;
    }

    template.slides = template.slides.filter((s) => s.id !== slideId);
    // Reorder positions
    template.slides.forEach((s, i) => {
      s.position = i;
    });

    return template.save();
  }

  /**
   * Reorder slides
   */
  async reorderSlides(templateId: string, slideIds: string[]): Promise<ITemplate | null> {
    const template = await Template.findById(templateId);
    if (!template) {
      return null;
    }

    // Reorder based on slideIds array
    const slideMap = new Map(template.slides.map((s) => [s.id, s]));
    template.slides = slideIds
      .map((id, index) => {
        const slide = slideMap.get(id);
        if (slide) {
          slide.position = index;
          return slide;
        }
        return null;
      })
      .filter((s): s is ITemplateSlide => s !== null);

    return template.save();
  }

  /**
   * Delete a template
   */
  async delete(id: string): Promise<boolean> {
    const result = await Template.deleteOne({ _id: id });
    return result.deletedCount === 1;
  }

  /**
   * Check if user owns template
   */
  async isOwner(templateId: string, userId: string): Promise<boolean> {
    const template = await Template.findById(templateId).select('userId').lean();
    return template?.userId === userId;
  }

  // ============================================================
  // CREATION FLOWS
  // ============================================================

  /**
   * Create template from TikTok URL
   * 1. Scrape TikTok slideshow
   * 2. Analyze each slide with AI
   * 3. Generate remix plan with Pinterest queries
   * 4. Fetch Pinterest images and create collections
   * 5. Create template with linked collections
   */
  async createFromTikTok(options: CreateFromTikTokOptions): Promise<ITemplate> {
    const { userId, tiktokUrl, fetchPinterestImages = true } = options;

    // Step 1: Scrape TikTok
    console.log('Scraping TikTok:', tiktokUrl);
    const tiktokData = await scrapeTikTokSlideshow(tiktokUrl);
    console.log(`Found ${tiktokData.slides.length} slides`);

    // Step 2: Analyze slides
    console.log('Analyzing slides...');
    const analyses = await analyzeSlides(tiktokData.slides.map((s) => s.imageUrl));
    console.log('Slide analysis complete');

    // Step 3: Generate remix plan (this gives us Pinterest queries and text)
    console.log('Generating remix plan...');
    const remixPlans = await generateRemixPlan(
      analyses.map((a, i) => ({ ...a, index: i })),
      tiktokData.caption || 'Create engaging slideshow content',
      undefined, // No product context for template
      undefined // No user guidance
    );
    console.log('Remix plan generated');

    // Step 4: Create collections with Pinterest images (if enabled)
    const slides: ITemplateSlide[] = [];

    if (fetchPinterestImages) {
      const scraper = createPinterestScraper();
      if (scraper) {
        // Fetch all Pinterest queries at once
        const queries = remixPlans.map((p) => p.pinterestQuery).filter(Boolean);
        console.log('Fetching Pinterest images for queries:', queries);
        const pinterestResults = await scraper.searchMultiple(queries);

        // Create collection for each slide
        for (let i = 0; i < tiktokData.slides.length; i++) {
          const plan = remixPlans[i];
          const tiktokSlide = tiktokData.slides[i];
          const pinterestImages = pinterestResults.get(plan.pinterestQuery) || [];

          // Create Image records
          const imageRecords = await Image.insertMany(
            pinterestImages.slice(0, IMAGES_PER_COLLECTION).map((url) => ({
              userId,
              url,
              source: 'pinterest' as const,
            }))
          );

          // Create Collection
          const collection = await Collection.create({
            userId,
            name: `${tiktokData.authorName || 'TikTok'} - Slide ${i + 1}`,
            description: plan.pinterestQuery,
            imageIds: imageRecords.map((img) => img._id),
            thumbnailUrl: pinterestImages[0] || tiktokSlide.imageUrl,
          });

          // Create slide with collection
          slides.push(this.createSlideFromPlan(i, plan, collection._id, tiktokSlide.imageUrl));
        }
      } else {
        // No Pinterest - create slides without collections
        for (let i = 0; i < tiktokData.slides.length; i++) {
          slides.push(
            this.createSlideFromPlan(i, remixPlans[i], undefined, tiktokData.slides[i].imageUrl)
          );
        }
      }
    } else {
      // Skip Pinterest - create slides without collections
      for (let i = 0; i < tiktokData.slides.length; i++) {
        slides.push(
          this.createSlideFromPlan(i, remixPlans[i], undefined, tiktokData.slides[i].imageUrl)
        );
      }
    }

    // Step 5: Create template
    const template = await this.create({
      userId,
      name: tiktokData.authorName ? `@${tiktokData.authorName}` : 'TikTok Import',
      source: {
        type: 'tiktok',
        url: tiktokUrl,
        authorName: tiktokData.authorName,
      },
      slides,
      thumbnailUrl: tiktokData.slides[0]?.imageUrl,
    });

    console.log('Template created:', template._id);
    return template;
  }

  /**
   * Create template from AI prompt
   * 1. Generate slide plan with AI
   * 2. Fetch Pinterest images and create collections
   * 3. Create template with linked collections
   */
  async createFromPrompt(options: CreateFromPromptOptions): Promise<ITemplate> {
    const { userId, prompt, slideCount, fetchPinterestImages = true } = options;

    // Step 1: Generate plan
    console.log('Generating plan from prompt:', prompt);
    const plans = await generateCreatePlan(prompt, slideCount);
    console.log(`Generated ${plans.length} slide plans`);

    // Step 2: Create collections with Pinterest images (if enabled)
    const slides: ITemplateSlide[] = [];

    if (fetchPinterestImages) {
      const scraper = createPinterestScraper();
      if (scraper) {
        // Fetch all Pinterest queries at once
        const queries = plans.map((p) => p.pinterestQuery).filter(Boolean);
        console.log('Fetching Pinterest images for queries:', queries);
        const pinterestResults = await scraper.searchMultiple(queries);

        // Create collection for each slide
        for (let i = 0; i < plans.length; i++) {
          const plan = plans[i];
          const pinterestImages = pinterestResults.get(plan.pinterestQuery) || [];

          if (pinterestImages.length > 0) {
            // Create Image records
            const imageRecords = await Image.insertMany(
              pinterestImages.slice(0, IMAGES_PER_COLLECTION).map((url) => ({
                userId,
                url,
                source: 'pinterest' as const,
              }))
            );

            // Create Collection
            const collection = await Collection.create({
              userId,
              name: `Slide ${i + 1} Images`,
              description: plan.pinterestQuery,
              imageIds: imageRecords.map((img) => img._id),
              thumbnailUrl: pinterestImages[0],
            });

            slides.push(this.createSlideFromPlan(i, plan, collection._id, pinterestImages[0]));
          } else {
            slides.push(this.createSlideFromPlan(i, plan));
          }
        }
      } else {
        // No Pinterest - create slides without collections
        for (let i = 0; i < plans.length; i++) {
          slides.push(this.createSlideFromPlan(i, plans[i]));
        }
      }
    } else {
      // Skip Pinterest - create slides without collections
      for (let i = 0; i < plans.length; i++) {
        slides.push(this.createSlideFromPlan(i, plans[i]));
      }
    }

    // Step 3: Create template
    const template = await this.create({
      userId,
      name: this.generateNameFromPrompt(prompt),
      source: {
        type: 'prompt',
      },
      slides,
      thumbnailUrl: slides[0]?.backgroundImageUrl,
    });

    console.log('Template created:', template._id);
    return template;
  }

  /**
   * Create blank template from scratch
   */
  async createFromScratch(options: CreateFromScratchOptions): Promise<ITemplate> {
    const { userId, name, slideCount } = options;

    const slides: ITemplateSlide[] = [];
    for (let i = 0; i < slideCount; i++) {
      slides.push({
        id: uuidv4(),
        position: i,
        width: 1080,
        height: 1920,
        textBoxes: [
          {
            id: uuidv4(),
            defaultText: `Slide ${i + 1}`,
            variableName: 'headline',
            x: 50,
            y: 50,
            fontSize: 48,
            fontFamily: 'Inter, system-ui, sans-serif',
            color: '#ffffff',
            backgroundColor: null,
            textAlign: 'center',
          },
        ],
      });
    }

    const template = await this.create({
      userId,
      name,
      source: {
        type: 'scratch',
      },
      slides,
    });

    return template;
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  private createSlideFromPlan(
    position: number,
    plan: RemixPlan,
    collectionId?: Types.ObjectId,
    imageUrl?: string
  ): ITemplateSlide {
    return {
      id: uuidv4(),
      position,
      width: 1080,
      height: 1920,
      backgroundCollectionId: collectionId,
      backgroundImageUrl: imageUrl,
      textBoxes: [
        {
          id: uuidv4(),
          defaultText: plan.newOverlayText || `Slide ${position + 1}`,
          variableName: 'headline',
          x: 50,
          y: 85, // Bottom area like TikTok
          fontSize: 32,
          fontFamily: 'Inter, system-ui, sans-serif',
          color: '#ffffff',
          backgroundColor: '#000000',
          textAlign: 'center',
        },
      ],
    };
  }

  private generateNameFromPrompt(prompt: string): string {
    const cleaned = prompt.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();

    if (cleaned.length <= 40) {
      return cleaned;
    }

    return cleaned.slice(0, 40).replace(/\s+\S*$/, '') + '...';
  }
}

export const templateService = new TemplateService();
