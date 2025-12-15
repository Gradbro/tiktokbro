import { getGeminiClient, TEXT_MODEL, SlideAnalysis } from './gemini.service';
import { SlidePlan } from '../types';

export interface RemixPlan {
  slideNumber: number;
  pinterestQuery: string;
  newOverlayText: string;
  layoutNotes: string;
}

export async function generateSlidePlan(prompt: string, slideCount: number): Promise<SlidePlan[]> {
  const ai = getGeminiClient();

  const systemPrompt = `You are a TikTok slideshow content planner. Create engaging, viral-worthy slide plans.

Given a topic, create exactly ${slideCount} slides for a TikTok slideshow. Each slide should:
- Have compelling content that hooks viewers
- Have a detailed image prompt for AI image generation
- Have suggested text overlay (short, impactful, TikTok-style)

Return ONLY a valid JSON array with this exact structure:
[
  {
    "slideNumber": 1,
    "imagePrompt": "Detailed description for AI image generation - include style, mood, colors, composition",
    "suggestedOverlay": "Short text for overlay (2-5 words)"
  }
]

Make each slide flow into the next for storytelling. Keep content TikTok-appropriate and engaging.`;

  const userPrompt = `Create a ${slideCount}-slide TikTok slideshow about: ${prompt}`;

  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: [
      { role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] }
    ],
  });

  const text = response.text;
  if (!text) {
    throw new Error('No response from Gemini');
  }

  // Extract JSON from response (handle potential markdown code blocks)
  let jsonStr = text;
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  } else {
    // Try to find JSON array directly
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      jsonStr = arrayMatch[0];
    }
  }

  try {
    const plans: SlidePlan[] = JSON.parse(jsonStr);

    // Validate structure
    if (!Array.isArray(plans) || plans.length === 0) {
      throw new Error('Invalid response structure');
    }

    return plans.map((plan, index) => ({
      slideNumber: index + 1,
      imagePrompt: plan.imagePrompt || '',
      suggestedOverlay: plan.suggestedOverlay || '',
    }));
  } catch (parseError) {
    console.error('Failed to parse Gemini response:', text);
    throw new Error('Failed to parse slide plan from AI response');
  }
}

/**
 * Generate a remix plan based on original slide analyses and user's new topic
 * Returns Pinterest search queries and new overlay text for each slide
 */
export async function generateRemixPlan(
  originalAnalyses: (SlideAnalysis & { index: number })[],
  userPrompt: string
): Promise<RemixPlan[]> {
  const ai = getGeminiClient();

  const slideDescriptions = originalAnalyses.map((a, i) => 
    `Slide ${i + 1}: Background: ${a.backgroundType} (${a.backgroundStyle}), Text: "${a.extractedText}" at ${a.textPlacement}`
  ).join('\n');

  const systemPrompt = `You are a TikTok slideshow remix planner. Given an analysis of an original slideshow and a new topic, create a remix plan that maintains the original format/style but with new content.

Original slideshow analysis:
${slideDescriptions}

User wants to create a new slideshow about: ${userPrompt}

For each slide, provide:
1. A Pinterest search query to find a similar background image (be specific: include style, mood, subject)
2. New overlay text that matches the original format but for the new topic
3. Brief layout notes

Return ONLY a valid JSON array with this exact structure:
[
  {
    "slideNumber": 1,
    "pinterestQuery": "specific search terms for Pinterest (e.g., 'aesthetic mountain sunset photography')",
    "newOverlayText": "Short text matching original style",
    "layoutNotes": "Brief notes on text placement and style"
  }
]

Match the original slideshow's:
- Number of slides (${originalAnalyses.length} slides)
- Text style and length
- Visual aesthetic
- Storytelling flow`;

  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: [
      { role: 'user', parts: [{ text: systemPrompt }] }
    ],
  });

  const text = response.text;
  if (!text) {
    throw new Error('No response from Gemini');
  }

  // Extract JSON from response
  let jsonStr = text;
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  } else {
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      jsonStr = arrayMatch[0];
    }
  }

  try {
    const plans: RemixPlan[] = JSON.parse(jsonStr);

    if (!Array.isArray(plans) || plans.length === 0) {
      throw new Error('Invalid response structure');
    }

    return plans.map((plan, index) => ({
      slideNumber: index + 1,
      pinterestQuery: plan.pinterestQuery || '',
      newOverlayText: plan.newOverlayText || '',
      layoutNotes: plan.layoutNotes || '',
    }));
  } catch {
    console.error('Failed to parse Gemini remix response:', text);
    throw new Error('Failed to parse remix plan from AI response');
  }
}
