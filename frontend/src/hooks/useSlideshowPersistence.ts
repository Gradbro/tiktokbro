import { useState, useCallback } from 'react';
import {
  saveSlideshow,
  updateSlideshow,
  getSlideshow,
  listSlideshows,
  deleteSlideshow,
  searchSlideshows,
} from '@/lib/api-client';
import { SlideshowSession, SlideshowListItem } from '@/types';
import { toast } from 'sonner';

interface UseSlideshowPersistenceReturn {
  // State
  isLoading: boolean;
  isSaving: boolean;
  slideshows: SlideshowListItem[];
  total: number;
  pages: number;
  currentPage: number;

  // Actions
  save: (session: SlideshowSession) => Promise<boolean>;
  load: (sessionId: string) => Promise<SlideshowSession | null>;
  loadList: (page?: number, limit?: number) => Promise<void>;
  remove: (sessionId: string) => Promise<boolean>;
  search: (query: string) => Promise<SlideshowListItem[]>;
}

export function useSlideshowPersistence(): UseSlideshowPersistenceReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [slideshows, setSlideshows] = useState<SlideshowListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  /**
   * Save or update a slideshow session
   */
  const save = useCallback(async (session: SlideshowSession): Promise<boolean> => {
    setIsSaving(true);
    try {
      // Try to update first, if it fails (404), create new
      const updateResult = await updateSlideshow(session).catch(() => null);

      if (updateResult?.success) {
        toast.success('Slideshow saved');
        return true;
      }

      // Create new if update failed
      const createResult = await saveSlideshow(session);
      if (createResult.success) {
        toast.success('Slideshow created');
        return true;
      }

      toast.error(createResult.error || 'Failed to save slideshow');
      return false;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save';
      toast.error(message);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

  /**
   * Load a slideshow session by ID
   */
  const load = useCallback(async (sessionId: string): Promise<SlideshowSession | null> => {
    setIsLoading(true);
    try {
      const result = await getSlideshow(sessionId);
      if (result.success && result.data) {
        // Transform the data to match frontend format
        // Backend uses sessionId, frontend uses id
        const backendData = result.data as unknown as {
          sessionId?: string;
          prompt: string;
          stage: string;
          plans: SlideshowSession['plans'];
          slides: SlideshowSession['slides'];
          config: SlideshowSession['config'];
          tiktokData?: SlideshowSession['tiktokData'];
          slideAnalyses?: SlideshowSession['slideAnalyses'];
          remixPlans?: SlideshowSession['remixPlans'];
          productContext?: string;
        };

        const session: SlideshowSession = {
          id: backendData.sessionId || sessionId,
          prompt: backendData.prompt,
          stage: backendData.stage as SlideshowSession['stage'],
          plans: backendData.plans || [],
          slides: backendData.slides || [],
          config: backendData.config,
          tiktokData: backendData.tiktokData,
          slideAnalyses: backendData.slideAnalyses,
          remixPlans: backendData.remixPlans,
          productContext: backendData.productContext,
        };
        return session;
      }
      toast.error(result.error || 'Slideshow not found');
      return null;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load slideshow';
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Load paginated list of slideshows
   */
  const loadList = useCallback(async (page: number = 1, limit: number = 20): Promise<void> => {
    setIsLoading(true);
    try {
      const result = await listSlideshows(page, limit);
      if (result.success) {
        setSlideshows(result.sessions);
        setTotal(result.total);
        setPages(result.pages);
        setCurrentPage(page);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load slideshows';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Delete a slideshow
   */
  const remove = useCallback(
    async (sessionId: string): Promise<boolean> => {
      try {
        const result = await deleteSlideshow(sessionId);
        if (result.success) {
          toast.success('Slideshow deleted');
          // Refresh the list
          await loadList(currentPage);
          return true;
        }
        toast.error(result.error || 'Failed to delete slideshow');
        return false;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to delete';
        toast.error(message);
        return false;
      }
    },
    [currentPage, loadList]
  );

  /**
   * Search slideshows by name or prompt
   */
  const search = useCallback(async (query: string): Promise<SlideshowListItem[]> => {
    if (!query.trim()) return [];

    setIsLoading(true);
    try {
      const result = await searchSlideshows(query);
      if (result.success && result.data) {
        return result.data;
      }
      return [];
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Search failed';
      toast.error(message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    isSaving,
    slideshows,
    total,
    pages,
    currentPage,
    save,
    load,
    loadList,
    remove,
    search,
  };
}
