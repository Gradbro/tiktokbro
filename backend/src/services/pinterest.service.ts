import axios, { AxiosInstance } from 'axios';

export class PinterestScraper {
  private session: AxiosInstance;
  private baseUrl = 'https://www.pinterest.com';
  private userAgent =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  private errors: string[] = [];
  private sleepTime: number;

  constructor(options?: { userAgent?: string; sleepTime?: number }) {
    this.userAgent = options?.userAgent || this.userAgent;
    this.sleepTime = options?.sleepTime || 0;

    this.session = axios.create({
      headers: {
        'User-Agent': this.userAgent,
        Accept: 'application/json, text/javascript, */*, q=0.01',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 30000,
    });
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private getBaseHeaders() {
    return {
      Host: 'www.pinterest.com',
      'Sec-Ch-Ua-Platform': '"macOS"',
      'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'Sec-Ch-Ua-Mobile': '?0',
      'X-Requested-With': 'XMLHttpRequest',
      Accept: 'application/json, text/javascript, */*, q=0.01',
      'X-Pinterest-Appstate': 'active',
      'Accept-Language': 'en-US,en;q=0.9',
      'X-Pinterest-Pws-Handler': 'www/search/[scope].js',
      'User-Agent': this.userAgent,
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Dest': 'empty',
      Referer: `${this.baseUrl}/search/pins/?q=aesthetic`,
    };
  }

  /**
   * Search Pinterest directly using their internal API
   */
  async search(query: string, limit = 26): Promise<string[]> {
    // Request extra to account for filtered results
    const pageSize = Math.min(limit + 10, 100);
    const sourceUrl = `/search/pins/?q=${encodeURIComponent(query)}&rs=typed`;

    // Initial request to set cookies
    try {
      await this.session.get(`${this.baseUrl}${sourceUrl}`);
    } catch {
      // Ignore cookie fetch errors
    }

    const options = {
      applied_unified_filters: null,
      appliedProductFilters: '---',
      article: null,
      auto_correction_disabled: false,
      corpus: null,
      customized_rerank_type: null,
      domains: null,
      filters: null,
      journey_depth: null,
      page_size: pageSize,
      price_max: null,
      price_min: null,
      query_pin_sigs: null,
      query: query,
      redux_normalize_feed: true,
      request_params: null,
      rs: 'typed',
      scope: 'pins',
      selected_one_bar_modules: null,
      source_id: null,
      source_module_id: null,
      seoDrawerEnabled: false,
      source_url: sourceUrl,
      top_pin_id: null,
      top_pin_ids: null,
    };

    const data = JSON.stringify({ options, context: {} });

    const ts = Date.now();
    const url = `${this.baseUrl}/resource/BaseSearchResource/get/?source_url=${encodeURIComponent(sourceUrl)}&data=${encodeURIComponent(data)}&_=${ts}`;

    const headers = {
      ...this.getBaseHeaders(),
      'X-Pinterest-Source-Url': sourceUrl,
    };

    try {
      const response = await this.session.get(url, { headers });

      if (this.sleepTime) {
        await this.sleep(this.sleepTime);
      }

      const imageUrls: string[] = [];
      const results = response.data?.resource_response?.data?.results || [];

      for (const result of results) {
        // Prefer web-optimized sizes (always JPEG) over orig (can be HEIC from iPhone uploads)
        // 736x is high quality and always web-friendly format
        const imageUrl =
          result?.images?.['736x']?.url ||
          result?.images?.['564x']?.url ||
          result?.images?.['474x']?.url ||
          result?.images?.orig?.url;

        if (imageUrl && !imageUrl.toLowerCase().endsWith('.heic')) {
          imageUrls.push(imageUrl);
          if (imageUrls.length >= limit) {
            break;
          }
        }
      }

      return imageUrls;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.errors.push(`Search failed: ${message}`);
      return [];
    }
  }

  /**
   * Get pin details from a user's board
   */
  async getBoardDetails(username: string, board: string): Promise<Record<string, unknown> | null> {
    const headers = {
      ...this.getBaseHeaders(),
      'x-pinterest-pws-handler': 'www/[username]/[slug].js',
      'x-pinterest-source-url': `/${username}/${board}/`,
    };

    const params = new URLSearchParams({
      source_url: `/${username}/${board}/`,
      data: JSON.stringify({
        options: { field_set_key: 'profile', username },
        context: {},
      }),
      _: String(Date.now()),
    });

    try {
      const response = await this.session.get(
        `${this.baseUrl}/resource/UserResource/get/?${params}`,
        { headers }
      );
      return response.data;
    } catch {
      return null;
    }
  }

  getErrors(): string[] {
    return this.errors;
  }
}

export const pinterestScraper = new PinterestScraper({ sleepTime: 300 });
