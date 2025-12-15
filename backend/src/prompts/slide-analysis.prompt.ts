/**
 * Prompt for analyzing TikTok slideshow images using Gemini Vision
 * Extracts exact image description, background style, text content, and placement
 */
export const SLIDE_ANALYSIS_PROMPT = `You are analyzing a TikTok slideshow image. These images have TWO distinct layers:
1. A BACKGROUND IMAGE (photo/illustration behind everything)
2. TEXT OVERLAYS (words/sentences ADDED ON TOP by the creator - usually with solid background boxes, shadows, or distinct fonts)

Your job is to SEPARATELY identify each layer. Return ONLY a valid JSON object:

{
  "imageDescription": "5-7 word Pinterest search query for the BACKGROUND IMAGE ONLY. Ignore ALL text. Describe: the scene, objects, setting, aesthetic. Example: 'cozy bed laptop pinterest aesthetic' or 'coffee shop window rainy day'",
  "backgroundType": "photo | illustration | gradient | solid | collage",
  "backgroundStyle": "The visual aesthetic (cozy, minimalist, dark moody, bright, aesthetic, vintage, etc.)",
  "extractedText": "ONLY the OVERLAY text added by the creator. NOT text that naturally appears in the photo (like text on screens, signs, books, shirts, etc.)",
  "textPlacement": "Where the OVERLAY text appears: top | center | bottom | full-screen | multiple-areas"
}

CRITICAL - DISTINGUISHING OVERLAY TEXT vs BACKGROUND TEXT:
- OVERLAY TEXT = Added by creator. Usually has: white/colored background boxes, drop shadows, consistent font style, positioned for readability
- BACKGROUND TEXT = Text that exists IN the photo naturally (laptop screens, phone screens, books, signs, clothing, etc.) - IGNORE THIS

HOW TO IDENTIFY OVERLAY TEXT:
1. Look for text with solid color backgrounds (white boxes, black boxes, etc.)
2. Look for text with drop shadows or outlines
3. Look for text that follows a consistent style/font throughout the slide
4. The overlay text is meant to be READ - it's the creator's message
5. Background text in photos is incidental and should be IGNORED

RULES:
1. imageDescription = ONLY the background photo/scene - describe what the PHOTO shows (person, setting, objects)
2. extractedText = ONLY the creator's OVERLAY text (the message they added)
3. If a laptop screen shows Pinterest - that's BACKGROUND, ignore it
4. If there's text in a white box saying "4. i saved time" - that's OVERLAY, extract it
5. Preserve line breaks with \\n in extractedText

Example: Image shows person in bed holding phone, laptop open to Pinterest, with white text boxes saying "4. i saved time" and "i uploaded my whole application..."
- imageDescription: "cozy bed laptop phone aesthetic"  
- extractedText: "4. i saved time\\n\\ni uploaded my whole application into an app called Admitted..."
- (Note: Text ON the laptop screen is IGNORED - only the white box overlays are extracted)`;
