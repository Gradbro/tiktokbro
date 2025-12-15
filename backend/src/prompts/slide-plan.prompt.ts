/**
 * Prompt for generating TikTok slideshow plans
 * Creates engaging, viral-worthy slide plans with image prompts and text overlays
 */
export function getSlidePlanPrompt(slideCount: number): string {
  return `You are a TikTok slideshow content planner. Create engaging, viral-worthy slide plans.

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
}

export function getSlidePlanUserPrompt(prompt: string, slideCount: number): string {
  return `Create a ${slideCount}-slide TikTok slideshow about: ${prompt}`;
}
