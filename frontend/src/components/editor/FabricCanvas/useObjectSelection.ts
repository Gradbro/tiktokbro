'use client';

import { useState, useCallback, useEffect } from 'react';
import * as fabric from 'fabric';
import { TikTokText } from '@/lib/fabric/TikTokText';
import type { SelectedObjectInfo, SelectionType, TextObjectProps, ImageObjectProps } from './types';
import { PREVIEW_WIDTH, PREVIEW_HEIGHT, DEFAULT_TEXT_PROPS } from './constants';
import { pixelsToPercent } from '@/lib/fabric/utils';

// Extended Fabric object type with data property
type FabricObjectWithData = fabric.FabricObject & {
  data?: Record<string, unknown>;
};

interface UseObjectSelectionOptions {
  canvas: fabric.Canvas | null;
}

export function useObjectSelection({ canvas }: UseObjectSelectionOptions) {
  const [selection, setSelection] = useState<SelectedObjectInfo>({
    type: 'none',
    object: null,
    id: null,
  });

  /**
   * Extract properties from a text object
   */
  const getTextProps = useCallback((obj: fabric.FabricObject): TextObjectProps | null => {
    if (!(obj instanceof TikTokText) && !('text' in obj)) {
      return null;
    }

    const textObj = obj as TikTokText;
    const objWithData = obj as FabricObjectWithData;
    const data = objWithData.data;

    return {
      id: (data?.id as string) || '',
      text: textObj.text || '',
      left: pixelsToPercent(obj.left || 0, PREVIEW_WIDTH),
      top: pixelsToPercent(obj.top || 0, PREVIEW_HEIGHT),
      width: (obj.width || 0) * (obj.scaleX || 1),
      height: (obj.height || 0) * (obj.scaleY || 1),
      fontSize: textObj.fontSize || DEFAULT_TEXT_PROPS.fontSize,
      fontFamily: textObj.fontFamily || DEFAULT_TEXT_PROPS.fontFamily,
      fontWeight: (textObj.fontWeight as string) || 'normal',
      fill: (textObj.fill as string) || DEFAULT_TEXT_PROPS.fill,
      stroke: (textObj.stroke as string) || null,
      strokeWidth: textObj.strokeWidth || 0,
      customBackgroundColor: textObj.customBackgroundColor || null,
      textAlign: (textObj.textAlign as 'left' | 'center' | 'right') || DEFAULT_TEXT_PROPS.textAlign,
      verticalAlign: 'middle',
      letterSpacing: 0,
      variableName: (data?.variableName as string) || '',
    };
  }, []);

  /**
   * Extract properties from an image object
   */
  const getImageProps = useCallback((obj: fabric.FabricObject): ImageObjectProps | null => {
    if (!('_element' in obj)) {
      return null;
    }

    const imgObj = obj as fabric.FabricImage;
    const objWithData = obj as FabricObjectWithData;
    const data = objWithData.data;

    return {
      id: (data?.id as string) || '',
      left: pixelsToPercent(obj.left || 0, PREVIEW_WIDTH),
      top: pixelsToPercent(obj.top || 0, PREVIEW_HEIGHT),
      width: (obj.width || 0) * (obj.scaleX || 1),
      height: (obj.height || 0) * (obj.scaleY || 1),
      scaleX: obj.scaleX || 1,
      scaleY: obj.scaleY || 1,
      angle: obj.angle || 0,
      src: (data?.originalSrc as string) || imgObj.getSrc() || '',
      collectionId: data?.collectionId as string | undefined,
    };
  }, []);

  /**
   * Determine selection type from object
   */
  const getSelectionType = useCallback((obj: fabric.FabricObject | null): SelectionType => {
    if (!obj) return 'none';

    const objWithData = obj as FabricObjectWithData;
    const data = objWithData.data;

    if (data?.isBackground) return 'background';
    if (obj instanceof TikTokText || 'text' in obj) return 'text';
    if ('_element' in obj) return 'image';

    return 'none';
  }, []);

  /**
   * Handle selection change from canvas
   */
  const handleSelectionChange = useCallback(() => {
    if (!canvas) {
      setSelection({ type: 'none', object: null, id: null });
      return;
    }

    const activeObject = canvas.getActiveObject() as FabricObjectWithData | undefined;
    if (!activeObject) {
      setSelection({ type: 'none', object: null, id: null });
      return;
    }

    const data = activeObject.data;
    const type = getSelectionType(activeObject);

    setSelection({
      type,
      object: activeObject,
      id: (data?.id as string) || null,
    });
  }, [canvas, getSelectionType]);

  /**
   * Handle selection cleared
   */
  const handleSelectionCleared = useCallback(() => {
    setSelection({ type: 'none', object: null, id: null });
  }, []);

  /**
   * Set up canvas event listeners
   */
  useEffect(() => {
    if (!canvas) return;

    canvas.on('selection:created', handleSelectionChange);
    canvas.on('selection:updated', handleSelectionChange);
    canvas.on('selection:cleared', handleSelectionCleared);
    canvas.on('object:modified', handleSelectionChange);

    return () => {
      canvas.off('selection:created', handleSelectionChange);
      canvas.off('selection:updated', handleSelectionChange);
      canvas.off('selection:cleared', handleSelectionCleared);
      canvas.off('object:modified', handleSelectionChange);
    };
  }, [canvas, handleSelectionChange, handleSelectionCleared]);

  /**
   * Get current text properties if text is selected
   */
  const textProps =
    selection.type === 'text' && selection.object ? getTextProps(selection.object) : null;

  /**
   * Get current image properties if image is selected
   */
  const imageProps =
    selection.type === 'image' && selection.object ? getImageProps(selection.object) : null;

  /**
   * Select an object by ID
   */
  const selectById = useCallback(
    (id: string) => {
      if (!canvas) return;

      const obj = canvas.getObjects().find((o) => {
        const objWithData = o as FabricObjectWithData;
        return objWithData.data?.id === id;
      });

      if (obj) {
        canvas.setActiveObject(obj);
        canvas.renderAll();
      }
    },
    [canvas]
  );

  /**
   * Clear selection
   */
  const clearSelection = useCallback(() => {
    if (!canvas) return;
    canvas.discardActiveObject();
    canvas.renderAll();
  }, [canvas]);

  return {
    selection,
    textProps,
    imageProps,
    selectById,
    clearSelection,
    handleSelectionChange,
  };
}
