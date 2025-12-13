'use client';

import { useState, useCallback } from 'react';
import { useSlideshowContext } from '@/context/SlideshowContext';
import { generatePlan, generateImage } from '@/lib/api-client';
import { ImageConfig, GeneratedSlide } from '@/types';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

export function useSlideshowGenerator() {
  const {
    session,
    initSession,
    setPlans,
    setStage,
    setSlides,
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

  return {
    session,
    isLoading,
    createPlan,
    generateImages,
    regenerateSlide,
  };
}
