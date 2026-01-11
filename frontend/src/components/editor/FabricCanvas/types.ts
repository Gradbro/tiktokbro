import type * as fabric from 'fabric';

/**
 * Canvas dimension presets
 */
export interface DimensionPreset {
  name: string;
  label: string;
  width: number;
  height: number;
  aspectRatio: string;
}

/**
 * Selection type based on what's selected on canvas
 */
export type SelectionType = 'none' | 'text' | 'image' | 'background';

/**
 * Selected object info exposed to properties panel
 */
export interface SelectedObjectInfo {
  type: SelectionType;
  object: fabric.FabricObject | null;
  id: string | null;
}

/**
 * Text object properties for the properties panel
 */
export interface TextObjectProps {
  id: string;
  text: string;
  left: number;
  top: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  fill: string;
  stroke: string | null;
  strokeWidth: number;
  customBackgroundColor: string | null;
  textAlign: 'left' | 'center' | 'right';
  verticalAlign: 'top' | 'middle' | 'bottom';
  letterSpacing: number;
  variableName?: string;
}

/**
 * Image object properties for the properties panel
 */
export interface ImageObjectProps {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  angle: number;
  src: string;
  collectionId?: string;
}

/**
 * Scene/canvas properties
 */
export interface SceneProps {
  width: number;
  height: number;
  backgroundColor: string;
}

/**
 * Color style variant for the color cycling system
 */
export interface ColorStyleVariant {
  color: string;
  backgroundColor: string | null;
}

/**
 * Color preset with its cycle variants
 */
export interface ColorPreset {
  baseColor: string;
  name: string;
  variants: ColorStyleVariant[];
}

/**
 * Canvas state for undo/redo (future use)
 */
export interface CanvasHistoryState {
  json: string;
  timestamp: number;
}

/**
 * Props for the FabricCanvas component
 */
export interface FabricCanvasProps {
  slide: {
    id: string;
    backgroundImageUrl?: string;
    backgroundColor?: string;
    textBoxes: Array<{
      id: string;
      defaultText: string;
      variableName: string;
      x: number;
      y: number;
      fontSize: number;
      fontFamily: string;
      color: string;
      backgroundColor: string | null;
      textAlign: 'left' | 'center' | 'right';
    }>;
    width: number;
    height: number;
  };
  sceneProps?: SceneProps;
  onSelectionChange?: (selection: SelectedObjectInfo) => void;
  onCanvasChange?: (slideData: FabricCanvasProps['slide']) => void;
  className?: string;
}
