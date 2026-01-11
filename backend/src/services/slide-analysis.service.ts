import { analyzeSlideImage, SlideAnalysis } from './gemini.service';

export type { SlideAnalysis } from './gemini.service';

/**
 * Default analysis when image cannot be fetched
 */
function getDefaultAnalysis(): SlideAnalysis {
  return {
    imageDescription: 'Unable to analyze - image not accessible',
    backgroundType: 'photo',
    backgroundStyle: 'unknown',
    extractedText: '',
    textPlacement: 'none',
  };
}

/**
 * Analyze a single slide image with error handling
 */
async function safeAnalyzeSlide(url: string): Promise<SlideAnalysis> {
  try {
    return await analyzeSlideImage(url);
  } catch (error) {
    console.warn(
      `Failed to analyze slide image: ${url}`,
      error instanceof Error ? error.message : error
    );
    return getDefaultAnalysis();
  }
}

/**
 * Analyze multiple slide images in parallel with graceful error handling
 */
export async function analyzeSlides(imageUrls: string[]): Promise<SlideAnalysis[]> {
  const analyses = await Promise.all(imageUrls.map((url) => safeAnalyzeSlide(url)));
  return analyses;
}
