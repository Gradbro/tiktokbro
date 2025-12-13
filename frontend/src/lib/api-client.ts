import {
  GeneratePlanRequest,
  GeneratePlanResponse,
  GenerateImageRequest,
  GenerateImageResponse,
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
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

export async function generatePlan(
  request: GeneratePlanRequest
): Promise<GeneratePlanResponse> {
  return fetchApi<GeneratePlanResponse>('/generate-plan', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function generateImage(
  request: GenerateImageRequest
): Promise<GenerateImageResponse> {
  return fetchApi<GenerateImageResponse>('/generate-image', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function healthCheck(): Promise<{ status: string; timestamp: string }> {
  return fetchApi('/health');
}
