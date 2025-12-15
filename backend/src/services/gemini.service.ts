import { GoogleGenAI } from '@google/genai';
import axios from 'axios';

let ai: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

export const TEXT_MODEL = 'gemini-2.0-flash';
export const IMAGE_MODEL = 'imagen-4.0-generate-001';

export interface SlideAnalysis {
  backgroundType: string;
  backgroundStyle: string;
  extractedText: string;
  textPlacement: string;
}

/**
 * Analyze a slide image using Gemini Vision
 * Extracts background type/style, text content, and text placement
 */
export async function analyzeSlideImage(imageUrl: string): Promise<SlideAnalysis> {
  const ai = getGeminiClient();

  // Fetch image and convert to base64
  const imageResponse = await axios.get(imageUrl, {
    responseType: 'arraybuffer',
    timeout: 30000,
  });
  const base64Image = Buffer.from(imageResponse.data).toString('base64');
  const mimeType = imageResponse.headers['content-type'] || 'image/jpeg';

  const prompt = `Analyze this TikTok slideshow image and extract the following information. Return ONLY a valid JSON object with these exact fields:

{
  "backgroundType": "Type of background (e.g., photo, illustration, gradient, solid color, collage)",
  "backgroundStyle": "Visual style description (e.g., aesthetic minimalist, vibrant nature photo, dark moody, vintage film, bright colorful)",
  "extractedText": "Any text visible on the slide (exact text, or empty string if none)",
  "textPlacement": "Where the text is positioned (e.g., center, top-center, bottom-third, left-aligned, or 'none' if no text)"
}

Be concise but descriptive. Focus on details that would help recreate a similar style.`;

  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Image,
            },
          },
          { text: prompt },
        ],
      },
    ],
  });

  const text = response.text;
  if (!text) {
    throw new Error('No response from Gemini Vision');
  }

  // Extract JSON from response
  let jsonStr = text;
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  } else {
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) {
      jsonStr = objMatch[0];
    }
  }

  try {
    const analysis: SlideAnalysis = JSON.parse(jsonStr);
    return {
      backgroundType: analysis.backgroundType || 'unknown',
      backgroundStyle: analysis.backgroundStyle || 'unknown',
      extractedText: analysis.extractedText || '',
      textPlacement: analysis.textPlacement || 'none',
    };
  } catch {
    console.error('Failed to parse Gemini Vision response:', text);
    throw new Error('Failed to parse slide analysis from AI response');
  }
}
