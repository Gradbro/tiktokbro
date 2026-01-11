import * as fabric from 'fabric';

/**
 * Canvas dimension constants
 */
export const CANVAS_DIMENSIONS = {
  PREVIEW_WIDTH: 405,
  PREVIEW_HEIGHT: 720,
  EXPORT_WIDTH: 1080,
  EXPORT_HEIGHT: 1920,
  SCALE_FACTOR: 1080 / 405, // ~2.67
} as const;

/**
 * Convert pixel position to percentage (0-100)
 */
export function pixelsToPercent(pixels: number, canvasDimension: number): number {
  return (pixels / canvasDimension) * 100;
}

/**
 * Convert percentage (0-100) to pixels
 */
export function percentToPixels(percent: number, canvasDimension: number): number {
  return (percent / 100) * canvasDimension;
}

/**
 * Get the backend API URL
 */
function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
}

/**
 * Create a proxied image URL to avoid CORS issues
 */
export function createProxiedImageUrl(originalUrl: string): string {
  if (!originalUrl) return '';

  // Skip proxy for data URLs or already proxied URLs
  if (originalUrl.startsWith('data:')) return originalUrl;

  const apiUrl = getApiUrl();
  if (originalUrl.includes(apiUrl)) return originalUrl;

  return `${apiUrl}/api/generate-image/proxy?url=${encodeURIComponent(originalUrl)}`;
}

/**
 * Load an image into Fabric.js with CORS proxy
 * Uses fetch with credentials to handle auth, then converts to data URL
 */
export async function loadImageWithProxy(url: string): Promise<fabric.FabricImage> {
  const proxiedUrl = createProxiedImageUrl(url);

  try {
    // Fetch with credentials to include auth cookies
    const response = await fetch(proxiedUrl, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    // Convert to blob then data URL
    const blob = await response.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    // Load the data URL into Fabric
    const img = await fabric.FabricImage.fromURL(dataUrl, {
      crossOrigin: 'anonymous',
    });

    if (!img) {
      throw new Error('Failed to create fabric image');
    }

    // Store original URL in custom property
    (img as fabric.FabricImage & { data?: Record<string, unknown> }).data = {
      originalSrc: url,
    };

    return img;
  } catch (error) {
    console.error('Failed to load image via proxy:', error);
    throw error;
  }
}

/**
 * Scale and position an image to cover the canvas (like CSS background-size: cover)
 */
export function fitImageToCover(
  image: fabric.FabricImage,
  canvasWidth: number,
  canvasHeight: number
): void {
  const imgWidth = image.width || 1;
  const imgHeight = image.height || 1;

  const canvasRatio = canvasWidth / canvasHeight;
  const imageRatio = imgWidth / imgHeight;

  let scale: number;
  let offsetX = 0;
  let offsetY = 0;

  if (imageRatio > canvasRatio) {
    // Image is wider - fit to height
    scale = canvasHeight / imgHeight;
    offsetX = (canvasWidth - imgWidth * scale) / 2;
  } else {
    // Image is taller - fit to width
    scale = canvasWidth / imgWidth;
    offsetY = (canvasHeight - imgHeight * scale) / 2;
  }

  image.set({
    scaleX: scale,
    scaleY: scale,
    left: offsetX,
    top: offsetY,
    originX: 'left',
    originY: 'top',
  });
}
