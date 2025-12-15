/**
 * Prompt for generating TikTok slideshow remix plans
 * Creates Pinterest search queries and new overlay text based on original slideshow analysis
 */
export function getRemixPlanPrompt(
  slideDescriptions: string,
  userPrompt: string,
  slideCount: number
): string {
  return `You are a TikTok slideshow remix planner. Given an analysis of an original slideshow and a new topic, create a remix plan.

Original slideshow analysis:
${slideDescriptions}

User wants to create a new slideshow about: ${userPrompt}

For each slide, provide:
1. A Pinterest search query - USE THE ORIGINAL imageDescription AS YOUR BASE. Only modify it if the user's topic requires a different subject. Keep the same aesthetic/style.
2. New overlay text that matches the original format but for the new topic
3. Brief layout notes

Return ONLY a valid JSON array with this exact structure:
[
  {
    "slideNumber": 1,
    "pinterestQuery": "Keep very similar to original imageDescription, only change subject if user topic requires it",
    "newOverlayText": "Short text matching original style",
    "layoutNotes": "Brief notes on text placement and style"
  }
]

IMPORTANT RULES:
- The pinterestQuery should be almost identical to the original imageDescription unless the user explicitly wants different imagery
- If user says "same style but about cooking" - keep the aesthetic (cozy, moody, etc.) but change the subject to cooking
- If user doesn't mention changing imagery, use the EXACT original imageDescription
- Number of slides: ${slideCount}
- Match text style, length, and placement of originals`;
}
