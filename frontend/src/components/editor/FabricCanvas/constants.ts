import type { DimensionPreset, ColorPreset, ColorStyleVariant } from './types';

/**
 * Canvas dimension constants
 */
export const PREVIEW_WIDTH = 405;
export const PREVIEW_HEIGHT = 720;
export const EXPORT_WIDTH = 1080;
export const EXPORT_HEIGHT = 1920;
export const SCALE_FACTOR = EXPORT_WIDTH / PREVIEW_WIDTH; // ~2.67

/**
 * Dimension presets for canvas aspect ratios
 */
export const DIMENSION_PRESETS: DimensionPreset[] = [
  {
    name: '9:16',
    label: 'Portrait',
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
  },
  {
    name: '3:4',
    label: 'Portrait',
    width: 1080,
    height: 1440,
    aspectRatio: '3:4',
  },
  {
    name: '16:9',
    label: 'Landscape',
    width: 1920,
    height: 1080,
    aspectRatio: '16:9',
  },
  {
    name: '1:1',
    label: 'Square',
    width: 1080,
    height: 1080,
    aspectRatio: '1:1',
  },
];

/**
 * Default fonts available in the editor
 */
export const FONT_FAMILIES = [
  'Inter',
  'Arial',
  'Helvetica',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Verdana',
  'Trebuchet MS',
  'Impact',
  'Comic Sans MS',
];

/**
 * Generate color style variants for a base color
 * Each color cycles through 3 states when clicked
 */
function getColorStyleVariants(baseColor: string): ColorStyleVariant[] {
  const isWhite = baseColor === '#FFFFFF' || baseColor === '#ffffff' || baseColor === 'white';

  if (isWhite) {
    // White cycles: white → black-on-white → white-on-black
    return [
      { color: '#FFFFFF', backgroundColor: null },
      { color: '#000000', backgroundColor: '#FFFFFF' },
      { color: '#FFFFFF', backgroundColor: '#000000' },
    ];
  }

  // Colors cycle: color → white-on-color → color-on-white
  return [
    { color: baseColor, backgroundColor: null },
    { color: '#FFFFFF', backgroundColor: baseColor },
    { color: baseColor, backgroundColor: '#FFFFFF' },
  ];
}

/**
 * Color presets with their cycling variants
 * Based on TikTok/Instagram text color styles
 */
export const COLOR_PRESETS: ColorPreset[] = [
  {
    baseColor: '#FFFFFF',
    name: 'White',
    variants: getColorStyleVariants('#FFFFFF'),
  },
  {
    baseColor: '#FF3B5C',
    name: 'Red',
    variants: getColorStyleVariants('#FF3B5C'),
  },
  {
    baseColor: '#7C3AED',
    name: 'Purple',
    variants: getColorStyleVariants('#7C3AED'),
  },
  {
    baseColor: '#10B981',
    name: 'Green',
    variants: getColorStyleVariants('#10B981'),
  },
  {
    baseColor: '#F59E0B',
    name: 'Orange',
    variants: getColorStyleVariants('#F59E0B'),
  },
];

/**
 * Default text properties for new text objects
 * Default style: white text with black border (stroke)
 * Stroke width ~15% of font size for thick visible outline
 */
export const DEFAULT_TEXT_PROPS = {
  fontSize: 48,
  fontFamily: 'Inter',
  fill: '#FFFFFF',
  stroke: '#000000',
  strokeWidth: 7,
  strokeLineJoin: 'round' as const,
  strokeLineCap: 'round' as const,
  paintFirst: 'stroke' as const,
  customBackgroundColor: null,
  textAlign: 'center' as const,
  fontWeight: 'bold',
  lineHeight: 1.3,
};

/**
 * Default canvas background color
 */
export const DEFAULT_BACKGROUND_COLOR = '#1a1a1a';

/**
 * Selection control styling
 */
export const SELECTION_STYLE = {
  borderColor: '#7C3AED',
  cornerColor: '#7C3AED',
  cornerStyle: 'circle' as const,
  cornerSize: 10,
  transparentCorners: false,
  borderScaleFactor: 2,
  padding: 5,
};
