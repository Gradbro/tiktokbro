import {
  GeneratePlanRequest,
  GeneratePlanResponse,
  GenerateImageRequest,
  GenerateImageResponse,
  TikTokScrapeRequest,
  TikTokScrapeResponse,
  TikTokAnalyzeRequest,
  TikTokAnalyzeResponse,
  RemixPlanRequest,
  RemixPlanResponse,
  PinterestSearchRequest,
  PinterestSearchResponse,
  SlideshowSession,
  SlideshowListResponse,
  SlideshowGetResponse,
  SlideshowSaveResponse,
  SlideshowDeleteResponse,
  SlideshowSearchResponse,
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}/api${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export async function generatePlan(request: GeneratePlanRequest): Promise<GeneratePlanResponse> {
  return fetchApi<GeneratePlanResponse>('/generate-plan', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function generateImage(request: GenerateImageRequest): Promise<GenerateImageResponse> {
  return fetchApi<GenerateImageResponse>('/generate-image', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function healthCheck(): Promise<{ status: string; timestamp: string }> {
  return fetchApi('/health');
}

// TikTok Import API
export async function scrapeTikTok(request: TikTokScrapeRequest): Promise<TikTokScrapeResponse> {
  return fetchApi<TikTokScrapeResponse>('/tiktok/scrape', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function analyzeTikTokSlides(
  request: TikTokAnalyzeRequest
): Promise<TikTokAnalyzeResponse> {
  return fetchApi<TikTokAnalyzeResponse>('/tiktok/analyze', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function generateRemixPlan(request: RemixPlanRequest): Promise<RemixPlanResponse> {
  return fetchApi<RemixPlanResponse>('/generate-plan/remix', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function searchPinterest(
  request: PinterestSearchRequest
): Promise<PinterestSearchResponse> {
  return fetchApi<PinterestSearchResponse>('/pinterest/search', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

// ==================== Slideshow Persistence API ====================

/**
 * Save a slideshow session to the database
 */
export async function saveSlideshow(session: SlideshowSession): Promise<SlideshowSaveResponse> {
  return fetchApi<SlideshowSaveResponse>('/slideshows', {
    method: 'POST',
    body: JSON.stringify({
      sessionId: session.id,
      prompt: session.prompt,
      stage: session.stage,
      plans: session.plans,
      slides: session.slides,
      config: session.config,
      tiktokData: session.tiktokData,
      slideAnalyses: session.slideAnalyses,
      remixPlans: session.remixPlans,
      productContext: session.productContext,
    }),
  });
}

/**
 * Update an existing slideshow session
 */
export async function updateSlideshow(session: SlideshowSession): Promise<SlideshowSaveResponse> {
  return fetchApi<SlideshowSaveResponse>(`/slideshows/${session.id}`, {
    method: 'PUT',
    body: JSON.stringify({
      prompt: session.prompt,
      stage: session.stage,
      plans: session.plans,
      slides: session.slides,
      config: session.config,
      tiktokData: session.tiktokData,
      slideAnalyses: session.slideAnalyses,
      remixPlans: session.remixPlans,
      productContext: session.productContext,
    }),
  });
}

/**
 * Get a slideshow session by ID
 */
export async function getSlideshow(sessionId: string): Promise<SlideshowGetResponse> {
  return fetchApi<SlideshowGetResponse>(`/slideshows/${sessionId}`);
}

/**
 * List all slideshow sessions with pagination
 */
export async function listSlideshows(
  page: number = 1,
  limit: number = 20
): Promise<SlideshowListResponse> {
  return fetchApi<SlideshowListResponse>(`/slideshows?page=${page}&limit=${limit}`);
}

/**
 * Search slideshows by name or prompt
 */
export async function searchSlideshows(
  query: string,
  limit: number = 10
): Promise<SlideshowSearchResponse> {
  return fetchApi<SlideshowSearchResponse>(
    `/slideshows/search?q=${encodeURIComponent(query)}&limit=${limit}`
  );
}

/**
 * Delete a slideshow session
 */
export async function deleteSlideshow(sessionId: string): Promise<SlideshowDeleteResponse> {
  return fetchApi<SlideshowDeleteResponse>(`/slideshows/${sessionId}`, {
    method: 'DELETE',
  });
}

/**
 * Duplicate a slideshow session
 */
export async function duplicateSlideshow(
  sessionId: string,
  newSessionId: string
): Promise<SlideshowSaveResponse> {
  return fetchApi<SlideshowSaveResponse>(`/slideshows/${sessionId}/duplicate`, {
    method: 'POST',
    body: JSON.stringify({ newSessionId }),
  });
}

// ==================== Settings API ====================

export interface SettingsResponse {
  success: boolean;
  data?: { productContext: string };
  error?: string;
}

/**
 * Get global settings
 */
export async function getSettings(): Promise<SettingsResponse> {
  return fetchApi<SettingsResponse>('/settings');
}

/**
 * Update global settings
 */
export async function updateSettings(productContext: string): Promise<SettingsResponse> {
  return fetchApi<SettingsResponse>('/settings', {
    method: 'PUT',
    body: JSON.stringify({ productContext }),
  });
}
