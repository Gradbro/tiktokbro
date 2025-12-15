'use client';

import { useState, useCallback } from 'react';
import { useSlideshowContext } from '@/context/SlideshowContext';
import { 
  generatePlan, 
  generateImage, 
  scrapeTikTok, 
  analyzeTikTokSlides, 
  generateRemixPlan,
  searchPinterest,
} from '@/lib/api-client';
import { ImageConfig, GeneratedSlide, RemixPlan, PinterestCandidate } from '@/types';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

export function useSlideshowGenerator() {
  const {
    session,
    initSession,
    initImportSession,
    setPlans,
    setStage,
    setSlides,
    setSlideAnalyses,
    setRemixPlans,
    updateRemixPlan,
    setPinterestCandidates,
  } = useSlideshowContext();

  const [isLoading, setIsLoading] = useState(false);

  const createPlan = useCallback(
    async (prompt: string, config: ImageConfig) => {
      setIsLoading(true);
      try {
        initSession(prompt, config);

        const response = await generatePlan({
          prompt,
          slideCount: config.slideCount,
        });

        if (!response.success || !response.plans) {
          throw new Error(response.error || 'Failed to generate plan');
        }

        setPlans(response.plans);
        toast.success('Plan generated! Review and edit before generating images.');
      } catch (error) {
        console.error('Error generating plan:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to generate plan');
        setStage('prompt');
      } finally {
        setIsLoading(false);
      }
    },
    [initSession, setPlans, setStage]
  );

  const generateImages = useCallback(async () => {
    if (!session?.plans || !session.config) {
      console.log('No plans or config available');
      return;
    }

    console.log('Starting image generation for', session.plans.length, 'slides');
    setIsLoading(true);
    setStage('generating');

    // Create initial slides with pending status
    const initialSlides: GeneratedSlide[] = session.plans.map((plan) => ({
      id: uuidv4(),
      slideNumber: plan.slideNumber,
      plan,
      status: 'pending' as const,
    }));

    setSlides(initialSlides);

    const slidesInProgress = [...initialSlides];

    for (let i = 0; i < slidesInProgress.length; i++) {
      const slide = slidesInProgress[i];

      slidesInProgress[i] = { ...slide, status: 'generating' };
      setSlides([...slidesInProgress]);

      try {
        const response = await generateImage({
          imagePrompt: slide.plan.imagePrompt,
          aspectRatio: session.config.aspectRatio,
          model: session.config.model,
        });

        if (!response.success || !response.imageData) {
          throw new Error(response.error || 'Failed to generate image');
        }

        slidesInProgress[i] = {
          ...slidesInProgress[i],
          status: 'complete',
          imageData: response.imageData,
        };
        setSlides([...slidesInProgress]);
      } catch (error) {
        console.error(`Error generating image for slide ${slide.slideNumber}:`, error);
        slidesInProgress[i] = {
          ...slidesInProgress[i],
          status: 'error',
          error: error instanceof Error ? error.message : 'Failed to generate image',
        };
        setSlides([...slidesInProgress]);
      }
    }

    setStage('editing');
    setIsLoading(false);
    toast.success('All images generated!');
  }, [session?.plans, session?.config, setStage, setSlides]);

  const regenerateSlide = useCallback(
    async (slideId: string) => {
      if (!session?.slides || !session.config) return;

      const slideIndex = session.slides.findIndex((s) => s.id === slideId);
      if (slideIndex === -1) return;

      const slide = session.slides[slideIndex];
      const updatedSlides = [...session.slides];

      updatedSlides[slideIndex] = {
        ...slide,
        status: 'generating',
        error: undefined,
      };
      setSlides(updatedSlides);

      try {
        const response = await generateImage({
          imagePrompt: slide.plan.imagePrompt,
          aspectRatio: session.config.aspectRatio,
          model: session.config.model,
        });

        if (!response.success || !response.imageData) {
          throw new Error(response.error || 'Failed to regenerate image');
        }

        updatedSlides[slideIndex] = {
          ...updatedSlides[slideIndex],
          status: 'complete',
          imageData: response.imageData,
        };
        setSlides([...updatedSlides]);

        toast.success('Image regenerated!');
      } catch (error) {
        console.error('Error regenerating image:', error);
        updatedSlides[slideIndex] = {
          ...updatedSlides[slideIndex],
          status: 'error',
          error: error instanceof Error ? error.message : 'Failed to regenerate image',
        };
        setSlides([...updatedSlides]);
        toast.error('Failed to regenerate image');
      }
    },
    [session?.slides, session?.config, setSlides]
  );

  // === TikTok Import Functions ===

  /**
   * Import a TikTok slideshow: scrape + analyze
   */
  const importFromTikTok = useCallback(
    async (tiktokUrl: string, config: ImageConfig) => {
      setIsLoading(true);
      try {
        // Step 1: Scrape TikTok
        toast.info('Scraping TikTok slideshow...');
        const scrapeResponse = await scrapeTikTok({ url: tiktokUrl });

        if (!scrapeResponse.success || !scrapeResponse.data) {
          throw new Error(scrapeResponse.error || 'Failed to scrape TikTok');
        }

        const tiktokData = scrapeResponse.data;
        
        if (tiktokData.slides.length === 0) {
          throw new Error('No slides found in this TikTok post');
        }

        // Initialize session with TikTok data
        initImportSession(tiktokData, config);

        // Step 2: Analyze slides with Gemini Vision
        toast.info(`Analyzing ${tiktokData.slides.length} slides...`);
        const analyzeResponse = await analyzeTikTokSlides({ slides: tiktokData.slides });

        if (!analyzeResponse.success || !analyzeResponse.data) {
          throw new Error(analyzeResponse.error || 'Failed to analyze slides');
        }

        setSlideAnalyses(analyzeResponse.data.analyses);
        setStage('prompt'); // Go to prompt stage for user to enter new topic
        
        toast.success(`Imported ${tiktokData.slides.length} slides! Now describe your new slideshow.`);
      } catch (error) {
        console.error('Error importing from TikTok:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to import TikTok');
        setStage('prompt');
      } finally {
        setIsLoading(false);
      }
    },
    [initImportSession, setSlideAnalyses, setStage]
  );

  /**
   * Generate remix plan based on analyses and user prompt
   */
  const createRemixPlan = useCallback(
    async (userPrompt: string) => {
      if (!session?.slideAnalyses || session.slideAnalyses.length === 0) {
        toast.error('No slide analyses available. Import a TikTok first.');
        return;
      }

      setIsLoading(true);
      try {
        toast.info('Generating remix plan...');
        const response = await generateRemixPlan({
          analyses: session.slideAnalyses,
          userPrompt,
        });

        if (!response.success || !response.plans) {
          throw new Error(response.error || 'Failed to generate remix plan');
        }

        setRemixPlans(response.plans);
        toast.success('Remix plan generated! Review and edit the Pinterest queries.');
      } catch (error) {
        console.error('Error generating remix plan:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to generate remix plan');
      } finally {
        setIsLoading(false);
      }
    },
    [session?.slideAnalyses, setRemixPlans]
  );

  /**
   * Search Pinterest for a single slide (user-triggered)
   */
  const searchPinterestForSlide = useCallback(
    async (slideNumber: number, query: string, limit = 5) => {
      try {
        toast.info(`Searching Pinterest for slide ${slideNumber}...`);
        const response = await searchPinterest({ query, limit });

        if (!response.success || !response.data) {
          throw new Error(response.error || 'Pinterest search failed');
        }

        const candidates: PinterestCandidate[] = response.data.urls.map((url) => ({
          imageUrl: url,
        }));

        setPinterestCandidates(slideNumber, candidates);
        toast.success(`Found ${candidates.length} images for slide ${slideNumber}`);
      } catch (error) {
        console.error('Pinterest search error:', error);
        toast.error(error instanceof Error ? error.message : 'Pinterest search failed');
      }
    },
    [setPinterestCandidates]
  );

  /**
   * Search Pinterest for all slides
   */
  const searchPinterestForAll = useCallback(
    async (limit = 5) => {
      if (!session?.remixPlans) return;

      setIsLoading(true);
      try {
        toast.info('Searching Pinterest for all slides...');
        
        for (const plan of session.remixPlans) {
          await searchPinterestForSlide(plan.slideNumber, plan.pinterestQuery, limit);
        }

        toast.success('Pinterest search complete for all slides!');
      } catch (error) {
        console.error('Error searching Pinterest:', error);
        toast.error('Failed to search Pinterest for some slides');
      } finally {
        setIsLoading(false);
      }
    },
    [session?.remixPlans, searchPinterestForSlide]
  );

  /**
   * Update a remix plan (e.g., edit Pinterest query)
   */
  const editRemixPlan = useCallback(
    (slideNumber: number, updates: Partial<RemixPlan>) => {
      updateRemixPlan(slideNumber, updates);
    },
    [updateRemixPlan]
  );

  return {
    session,
    isLoading,
    // Original flow
    createPlan,
    generateImages,
    regenerateSlide,
    // TikTok import flow
    importFromTikTok,
    createRemixPlan,
    searchPinterestForSlide,
    searchPinterestForAll,
    editRemixPlan,
  };
}
