/**
 * Prompt for generating TikTok slideshow remix plans
 * Creates Pinterest search queries and new overlay text based on original slideshow analysis
 */
export function getRemixPlanPrompt(
  slideDescriptions: string,
  userPrompt: string,
  slideCount: number,
  productContext?: string
): string {
  const productSection = productContext
    ? `
PRODUCT TO PROMOTE:
${productContext}
`
    : '';

  return `You are a TikTok slideshow remix expert.

Original slideshow analysis:
${slideDescriptions}

${productSection}
For each slide, provide:
1. pinterestQuery - USE THE EXACT imageDescription FROM THE ORIGINAL. DO NOT CHANGE IT.
2. newOverlayText - Create NEW content following the same structure (see rules below)
3. layoutNotes - Match original text placement

Return ONLY a valid JSON array:
[
  {
    "slideNumber": 1,
    "pinterestQuery": "EXACT imageDescription from original",
    "newOverlayText": "New text following same structure",
    "layoutNotes": "Match original placement"
  }
]

RULES:
- Slide 1 HOOK: Keep the same hook FORMAT. E.g., "the EASIEST way I learned to X" stays as "the EASIEST way I learned to X"
- Middle slides: Create NEW genuine tips/advice following the same narrative arc. These should NOT mention the product - just helpful content.
- Product mention: ONLY where the original mentioned their product (usually last 1-2 slides). Keep it subtle.
- Match the VIBE: casual tone, emoji usage, text length per slide
- pinterestQuery = EXACT copy of imageDescription. No changes.
- Number of slides: ${slideCount}

SUBTLE MARKETING:
- 90% of slides = genuine value, tips, relatable content
- Product appears naturally, not forced
- If someone can tell it's an ad, you failed
- The content should work even WITHOUT the product mention

The content should feel like a completely new slideshow that happens to use the same proven structure.`;
}
