export interface TextBox {
  id: string;
  text: string;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  fontSize: number; // pixels at preview scale
  color: string;
  backgroundColor: string | null; // null = no background, string = background color
  fontFamily: string;
  textAlign: 'left' | 'center' | 'right';
}

export interface CanvasEditorProps {
  imageUrl: string | null;
  textBoxes: TextBox[];
  selectedTextId: string | null;
  onTextBoxesChange: (textBoxes: TextBox[]) => void;
  onSelectionChange: (id: string | null) => void;
  width?: number;
  height?: number;
  className?: string;
}

export interface CanvasExportOptions {
  width: number;
  height: number;
  quality?: number;
  format?: 'image/png' | 'image/jpeg' | 'image/webp';
}

// Preview dimensions (9:16 aspect ratio) - larger for better editing
export const PREVIEW_WIDTH = 405;
export const PREVIEW_HEIGHT = 720;

// Export dimensions (TikTok standard)
export const EXPORT_WIDTH = 1080;
export const EXPORT_HEIGHT = 1920;

// Scale factor from preview to export
export const SCALE_FACTOR = EXPORT_WIDTH / PREVIEW_WIDTH;

export const DEFAULT_TEXT_BOX: Omit<TextBox, 'id'> = {
  text: 'Double-click to edit',
  x: 50,
  y: 50,
  fontSize: 24,
  color: '#ffffff',
  backgroundColor: null,
  fontFamily: 'Inter, system-ui, sans-serif',
  textAlign: 'center',
};

// Text color presets (Instagram-style palette)
export const TEXT_COLORS = [
  '#FFFFFF', // White (cycles: white → black-on-white → white-on-black)
  '#FF3B5C', // Red/Pink
  '#7C3AED', // Purple
  '#10B981', // Green
  '#F59E0B', // Orange/Yellow
] as const;

export type TextColorPreset = (typeof TEXT_COLORS)[number];

// Color style variant: each color can cycle through 3 states
export interface ColorStyleVariant {
  color: string;
  backgroundColor: string | null;
}

/**
 * Get the style variants for a given color.
 * - State 0: Plain text (color on transparent)
 * - State 1: White/Black text on color background
 * - State 2: Color text on white/black background
 */
export function getColorStyleVariants(baseColor: string): ColorStyleVariant[] {
  const isWhite = baseColor.toUpperCase() === '#FFFFFF';

  if (isWhite) {
    return [
      { color: '#FFFFFF', backgroundColor: null }, // White text
      { color: '#000000', backgroundColor: '#FFFFFF' }, // Black on white
      { color: '#FFFFFF', backgroundColor: '#000000' }, // White on black
    ];
  }

  // For colored options
  return [
    { color: baseColor, backgroundColor: null }, // Color text
    { color: '#FFFFFF', backgroundColor: baseColor }, // White on color
    { color: baseColor, backgroundColor: '#FFFFFF' }, // Color on white
  ];
}

/**
 * Find which variant index the current style matches for a color
 */
export function getCurrentVariantIndex(
  baseColor: string,
  currentColor: string,
  currentBg: string | null
): number {
  const variants = getColorStyleVariants(baseColor);
  const idx = variants.findIndex(
    (v) =>
      v.color.toUpperCase() === currentColor.toUpperCase() &&
      (v.backgroundColor?.toUpperCase() || null) === (currentBg?.toUpperCase() || null)
  );
  return idx >= 0 ? idx : -1;
}

// Legacy text style presets (kept for compatibility)
export type TextStylePreset = 'white' | 'black' | 'white-on-black' | 'black-on-white';

export const TEXT_STYLE_PRESETS: Record<
  TextStylePreset,
  { color: string; backgroundColor: string | null }
> = {
  white: { color: '#ffffff', backgroundColor: null },
  black: { color: '#000000', backgroundColor: null },
  'white-on-black': { color: '#ffffff', backgroundColor: '#000000' },
  'black-on-white': { color: '#000000', backgroundColor: '#ffffff' },
};
