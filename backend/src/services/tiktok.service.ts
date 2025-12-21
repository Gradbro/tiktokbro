import axios from 'axios';

const APIFY_API_URL = 'https://api.apify.com/v2';

export interface TikTokSlide {
  index: number;
  imageUrl: string;
}

export interface TikTokScrapeResult {
  originalUrl: string;
  caption: string;
  slides: TikTokSlide[];
  authorName?: string;
  videoUrl?: string;
}

/**
 * Scrape a TikTok Photo Mode slideshow using Apify's clockworks/tiktok-scraper
 */
export async function scrapeTikTokSlideshow(url: string): Promise<TikTokScrapeResult> {
  const apiKey = process.env.APIFY_API_KEY;
  if (!apiKey) {
    throw new Error('APIFY_API_KEY is not set in environment variables');
  }

  // Validate TikTok URL
  if (!url.includes('tiktok.com')) {
    throw new Error('Invalid TikTok URL');
  }

  const actorId = 'clockworks~tiktok-scraper';

  // Prepare the Actor input - use postURLs for specific post scraping
  const runInput = {
    postURLs: [url],
    resultsPerPage: 1,
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
    shouldDownloadSubtitles: false,
    shouldDownloadSlideshowImages: true,
  };

  // Start the actor run using the synchronous run endpoint
  // This waits for completion and returns results directly
  const runUrl = `${APIFY_API_URL}/acts/${actorId}/run-sync-get-dataset-items?token=${apiKey}`;

  try {
    const response = await axios.post(runUrl, runInput, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 120000, // 2 minute timeout for sync call
    });

    const items = response.data;
    if (!items || items.length === 0) {
      throw new Error('No results returned from TikTok scraper');
    }

    const post = items[0];

    // Extract slideshow images
    let slideImages: string[] = [];

    // Check for Photo Mode slideshow - the actual field from Apify
    if (post.isSlideshow && post.slideshowImageLinks && Array.isArray(post.slideshowImageLinks)) {
      slideImages = post.slideshowImageLinks
        .map(
          (img: { tiktokLink?: string; downloadLink?: string }) =>
            img.tiktokLink || img.downloadLink || ''
        )
        .filter(Boolean);
    }
    // Fallback: Check other possible field names
    else if (post.imagePost?.images && Array.isArray(post.imagePost.images)) {
      slideImages = post.imagePost.images
        .map((img: { imageURL?: { urlList?: string[] } }) => img.imageURL?.urlList?.[0] || '')
        .filter(Boolean);
    } else if (post.slideshowImages && Array.isArray(post.slideshowImages)) {
      slideImages = post.slideshowImages;
    } else if (post.imageUrls && Array.isArray(post.imageUrls)) {
      slideImages = post.imageUrls;
    } else if (post.images && Array.isArray(post.images)) {
      slideImages = post.images
        .map((img: string | { url?: string }) => (typeof img === 'string' ? img : img.url || ''))
        .filter(Boolean);
    }

    // If no images found, check if it's a video-only post
    if (slideImages.length === 0) {
      if (post.videoMeta?.duration > 0 || post.videoUrl || post.video?.playAddr) {
        throw new Error(
          'This TikTok post is a video, not a Photo Mode slideshow. Video-only posts are not supported in this MVP.'
        );
      }
      throw new Error(
        'Could not extract slideshow images from this TikTok post. The post may not be a Photo Mode slideshow.'
      );
    }

    return {
      originalUrl: url,
      caption: post.text || post.desc || post.description || '',
      slides: slideImages.map((imageUrl: string, index: number) => ({
        index,
        imageUrl,
      })),
      authorName: post.authorMeta?.name || post.author?.nickname || post.authorName || '',
      videoUrl: post.videoUrl || post.video?.playAddr || undefined,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status;
      const errorData = error.response?.data;

      if (statusCode === 402) {
        throw new Error(
          'Apify account has insufficient credits. Please add credits to your Apify account.'
        );
      }
      if (statusCode === 401) {
        throw new Error('Invalid Apify API key. Please check your APIFY_API_KEY.');
      }

      console.error('Apify API error:', statusCode, errorData);
      throw new Error(`Apify API error: ${errorData?.error?.message || error.message}`);
    }
    throw error;
  }
}
