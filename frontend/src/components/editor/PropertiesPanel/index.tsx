'use client';

import React from 'react';
import type {
  SelectionType,
  TextObjectProps,
  ImageObjectProps,
  SceneProps,
} from '../FabricCanvas/types';
import { SceneProperties } from './SceneProperties';
import { TextProperties } from './TextProperties';
import { ImageProperties } from './ImageProperties';

interface PropertiesPanelProps {
  selectionType: SelectionType;
  textProps: TextObjectProps | null;
  imageProps: ImageObjectProps | null;
  sceneProps: SceneProps;
  backgroundImageUrl?: string;
  onTextChange: (props: Partial<TextObjectProps>) => void;
  onImageChange: (props: Partial<ImageObjectProps>) => void;
  onSceneChange: (props: Partial<SceneProps>) => void;
  onFitImageToCanvas?: () => void;
  onImageSelect?: (imageUrl: string, collectionId: string) => void;
  onBackgroundImageSelect?: (imageUrl: string, collectionId: string) => void;
  onRemoveBackgroundImage?: () => void;
  onFitBackgroundImage?: () => void;
}

export function PropertiesPanel({
  selectionType,
  textProps,
  imageProps,
  sceneProps,
  backgroundImageUrl,
  onTextChange,
  onImageChange,
  onSceneChange,
  onFitImageToCanvas,
  onImageSelect,
  onBackgroundImageSelect,
  onRemoveBackgroundImage,
  onFitBackgroundImage,
}: PropertiesPanelProps) {
  return (
    <div className="flex h-full flex-col">
      {selectionType === 'text' && textProps && (
        <TextProperties props={textProps} onChange={onTextChange} />
      )}

      {/* Show ImageProperties for regular images (not background) */}
      {selectionType === 'image' && imageProps && (
        <div className="flex-1 overflow-y-auto p-4">
          <ImageProperties
            props={imageProps}
            onChange={onImageChange}
            onFitToCanvas={onFitImageToCanvas}
            onImageSelect={onImageSelect}
          />
        </div>
      )}

      {/* Show SceneProperties when nothing selected OR background is selected */}
      {(selectionType === 'none' || selectionType === 'background') && (
        <SceneProperties
          props={sceneProps}
          onChange={onSceneChange}
          backgroundImageUrl={backgroundImageUrl}
          onBackgroundImageSelect={onBackgroundImageSelect}
          onRemoveBackgroundImage={onRemoveBackgroundImage}
          onFitBackgroundImage={onFitBackgroundImage}
        />
      )}
    </div>
  );
}
