# Fabric.js Canvas Editor Plan

> **Status**: READY TO IMPLEMENT - Template Feature Plan is complete  
> **Depends on**: Template data models, API endpoints ✅ COMPLETED  
> **Purpose**: Replace raw HTML5 Canvas with Fabric.js object-based editor

---

## Prerequisites Completed ✅

The following items from `TEMPLATE_FEATURE_PLAN.md` have been implemented:

### Backend (All Complete)

- ✅ **Image model** - `backend/src/models/image.model.ts`
- ✅ **Image service** - `backend/src/services/image-entity.service.ts`
- ✅ **Image routes** - `backend/src/routes/image-library.routes.ts`
- ✅ **Collection model** - `backend/src/models/collection.model.ts`
- ✅ **Collection service** - `backend/src/services/collection.service.ts`
- ✅ **Collection routes** - `backend/src/routes/collection.routes.ts`
- ✅ **Product model** - `backend/src/models/product.model.ts`
- ✅ **Product service** - `backend/src/services/product.service.ts`
- ✅ **Product routes** - `backend/src/routes/product.routes.ts`
- ✅ **Template model** - `backend/src/models/template.model.ts` (with embedded slides/textboxes)
- ✅ **Template service** - `backend/src/services/template.service.ts` (3 creation flows)
- ✅ **Template routes** - `backend/src/routes/template.routes.ts`
- ✅ **Slide analysis service** - `backend/src/services/slide-analysis.service.ts`
- ✅ **Slideshow model updated** - Added `templateId` and `productId` fields
- ✅ **Routes registered** - All routes in `backend/src/routes/index.ts`

### Frontend (All Complete)

- ✅ **Types** - Added Template, Collection, Product types to `frontend/src/types/index.ts`
- ✅ **API Client** - Added all CRUD functions to `frontend/src/lib/api-client.ts`
- ✅ **Templates page** - `frontend/src/app/templates/page.tsx` with CreateTemplateModal
- ✅ **Template editor page** - `frontend/src/app/templates/[id]/page.tsx` with 3-panel layout
- ✅ **Sidebar navigation** - Templates link added to `AppSidebar.tsx`

### Template Creation Flows (All Complete)

- ✅ **Import from TikTok** - `templateService.createFromTikTok()` with Pinterest auto-fetch (25 images/slide)
- ✅ **Create from Prompt** - `templateService.createFromPrompt()` with AI-generated structure
- ✅ **Create from Scratch** - `templateService.createFromScratch()` with blank slides

---

## Current Features to Preserve

From analyzing the existing `CanvasEditor` implementation, these features MUST be carried over:

### From `types.ts`

```typescript
// Current TextBox interface
interface TextBox {
  id: string;
  text: string;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  fontSize: number; // pixels at preview scale
  color: string;
  backgroundColor: string | null; // null = no background
  fontFamily: string;
  textAlign: 'left' | 'center' | 'right';
}
```

### Current Color Style System

The current implementation has a **color cycling system** (Instagram-style):

```typescript
// 5 color presets that cycle through 3 states each
const TEXT_COLORS = [
  '#FFFFFF', // White (cycles: white → black-on-white → white-on-black)
  '#FF3B5C', // Red/Pink
  '#7C3AED', // Purple
  '#10B981', // Green
  '#F59E0B', // Orange/Yellow
];

// Each color has 3 variants:
// State 0: Plain text (color on transparent)
// State 1: White/Black text on color background
// State 2: Color text on white/black background
```

**MUST preserve this cycling behavior** - user clicks a color multiple times to cycle through variants.

### Current Canvas Features

| Feature              | Current Implementation    | Fabric.js Equivalent               |
| -------------------- | ------------------------- | ---------------------------------- |
| Preview dimensions   | 405×720 (9:16)            | Same, configurable                 |
| Export dimensions    | 1080×1920 (TikTok)        | Same                               |
| DPR scaling          | `window.devicePixelRatio` | Built-in                           |
| Image cover fit      | Custom calculation        | `fabric.Image` with custom scaling |
| Text word wrap       | Custom `wrapText()`       | `fabric.Textbox` auto-wraps        |
| Per-line backgrounds | Custom rendering          | Custom Fabric object or group      |
| Text shadow          | Only when no background   | Custom shadow config               |
| Hit testing          | Custom bounds calculation | Built-in                           |
| Drag & drop          | Custom mouse handlers     | Built-in                           |
| Double-click edit    | Custom textarea overlay   | `fabric.IText` built-in            |
| Image proxy          | Backend CORS proxy        | Same approach                      |

### Critical Rendering Details

1. **Per-line text backgrounds** (TikTok style):

   - Each line gets its own rounded rectangle background
   - NOT one box around all text
   - Current code: `ctx.roundRect()` per line

2. **Text shadow only without background**:

   - If `backgroundColor` is set: no shadow
   - If `backgroundColor` is null: drop shadow

3. **Line height**: `fontSize * 1.3` for background mode, `fontSize * 1.2` for normal

4. **Text alignment affects position interpretation**:
   - `center`: x is center point
   - `left`: x is left edge
   - `right`: x is right edge

---

## Why Fabric.js?

| Feature            | Raw Canvas (Current)  | Fabric.js                                 |
| ------------------ | --------------------- | ----------------------------------------- |
| Object model       | Manual tracking       | Built-in                                  |
| Selection handles  | Manual implementation | Built-in                                  |
| Drag/resize/rotate | Manual math           | Built-in                                  |
| Text editing       | Custom overlay        | IText/Textbox                             |
| JSON serialization | Manual                | `canvas.toJSON()` / `loadFromJSON()`      |
| Layer management   | Manual z-index        | Built-in `sendToBack()`, `bringToFront()` |
| Hit testing        | Manual bounds check   | Built-in                                  |
| Multi-select       | Not implemented       | Built-in (Shift+click)                    |
| Undo/Redo          | Not implemented       | State snapshots                           |

---

## Feature Requirements (From Competitor Analysis)

Based on Double Speed screenshots, we need:

### 1. Object Types

| Object     | Fabric Class                       | Use Case                          |
| ---------- | ---------------------------------- | --------------------------------- |
| Background | `fabric.Rect` (locked)             | Canvas background color/image     |
| Image      | `fabric.Image`                     | Product images, decorative images |
| Text       | `fabric.IText` or `fabric.Textbox` | Editable text with styling        |

### 2. Context-Sensitive Properties Panel

When different objects are selected, show different property editors:

#### A. Scene/Background Selected (or nothing selected)

```
┌─────────────────────────────────┐
│ Properties          Save As... │
├─────────────────────────────────┤
│ ⚠️ Background is locked and    │
│    cannot be moved or deleted  │
├─────────────────────────────────┤
│ Scene Dimensions               │
│ ┌─────────┐ ┌─────────┐        │
│ │9:16     │ │3:4      │        │
│ │Portrait │ │Portrait │        │
│ │1080×1920│ │1800×2000│        │
│ └─────────┘ └─────────┘        │
│ ┌─────────┐ ┌─────────┐        │
│ │16:9     │ │1:1      │        │
│ │Landscape│ │Square   │        │
│ │1920×1080│ │1080×1080│        │
│ └─────────┘ └─────────┘        │
├─────────────────────────────────┤
│ Width  [1080]  Height [1920]   │
│ Current aspect ratio: 0.56     │
├─────────────────────────────────┤
│ Background Type                │
│ ┌───────────────────────────┐  │
│ │         Color             │  │
│ └───────────────────────────┘  │
├─────────────────────────────────┤
│ Background Color               │
│ [  ■  ] [ #ffffff         ]    │
└─────────────────────────────────┘
```

**Properties:**

- `width`: number (canvas width)
- `height`: number (canvas height)
- `backgroundColor`: string (hex color)
- Presets: 9:16, 3:4, 16:9, 1:1

#### B. Text Object Selected

```
┌─────────────────────────────────┐
│ Properties          Save As... │
├─────────────────────────────────┤
│ Text Properties                │
│ ID: text-f7642938129086        │
├─────────────────────────────────┤
│ Transform                      │
│ X [181]  Y [990]               │
│ Width [777]  Height [84]       │
├─────────────────────────────────┤
│ Style Presets                  │
│ ┌───────────────────────────┐  │
│ │ Classic TikTok BG         │  │
│ │ Black text on white bg    │  │
│ └───────────────────────────┘  │
│ ┌───────────────────────────┐  │
│ │ Classic TikTok White      │  │
│ │ White text with outline   │  │
│ └───────────────────────────┘  │
├─────────────────────────────────┤
│ Text                           │
│ ┌───────────────────────────┐  │
│ │ 5 Culture shocks we saw   │  │
│ │ in Korea...               │  │
│ └───────────────────────────┘  │
├─────────────────────────────────┤
│ Font Family                    │
│ [ TikTok Display - Medium  ▼]  │
├─────────────────────────────────┤
│ Font Size                      │
│ ────●──────────────────  [90]  │
├─────────────────────────────────┤
│ Font Weight                    │
│ [ Regular                  ▼]  │
├─────────────────────────────────┤
│ Text Color                     │
│ [  ■  ] [ #000000         ]    │
├─────────────────────────────────┤
│ Alignment                      │
│ [Left] [Center] [Right]        │
├─────────────────────────────────┤
│ Vertical Alignment             │
│ [Top] [Middle] [Bottom]        │
├─────────────────────────────────┤
│ Letter Spacing                 │
│ ────●──────────────────  [4%]  │
└─────────────────────────────────┘
```

**Properties:**

- `left`, `top`: position (x, y)
- `width`, `height`: dimensions
- `text`: string content
- `fontFamily`: string
- `fontSize`: number (pixels)
- `fontWeight`: 'normal' | 'bold' | number
- `fill`: string (text color)
- `textAlign`: 'left' | 'center' | 'right'
- `verticalAlign`: 'top' | 'middle' | 'bottom' (custom)
- `charSpacing`: number (letter spacing)
- `backgroundColor`: string (text background) - **PER-LINE backgrounds like TikTok**
- `stroke`: string (outline color)
- `strokeWidth`: number

**Custom Properties (stored in object.data):**

- `variableName`: string - For template variables (e.g., "headline", "subtitle")
- `isPlaceholder`: boolean - Is this a template variable?
- `defaultText`: string - Original text before AI substitution

**Color Cycling System (from current implementation):**

```typescript
// Must preserve the current color cycling behavior
interface ColorCycleState {
  baseColor: string; // One of 5 preset colors
  variantIndex: number; // 0, 1, or 2
}

// User clicks color button → cycles through variants
// White: white → black-on-white → white-on-black
// Colors: color → white-on-color → color-on-white
```

**Style Presets (Save/Load):**

```typescript
interface TextStylePreset {
  id: string;
  name: string;
  description: string;
  styles: {
    fontFamily: string;
    fontSize: number;
    fontWeight: string | number;
    fill: string;
    backgroundColor?: string;
    stroke?: string;
    strokeWidth?: number;
    charSpacing?: number;
  };
}

// Built-in presets
const TEXT_PRESETS: TextStylePreset[] = [
  {
    id: 'classic-tiktok-bg',
    name: 'Classic TikTok BG',
    description: 'Black text on white background wrap',
    styles: {
      fontFamily: 'TikTok Display',
      fontSize: 48,
      fontWeight: 'bold',
      fill: '#000000',
      backgroundColor: '#ffffff',
    },
  },
  {
    id: 'classic-tiktok-white',
    name: 'Classic TikTok White',
    description: 'White text with black outline',
    styles: {
      fontFamily: 'TikTok Display',
      fontSize: 48,
      fontWeight: 'bold',
      fill: '#ffffff',
      stroke: '#000000',
      strokeWidth: 2,
    },
  },
];
```

#### C. Image Object Selected

```
┌─────────────────────────────────┐
│ Properties          Save As... │
├─────────────────────────────────┤
│ Image Properties               │
│ ID: image-f7642938f0379        │
├─────────────────────────────────┤
│ Transform                      │
│ X [-15]  Y [-42]               │
│ Width [1108]  Height [1945]    │
├─────────────────────────────────┤
│ ┌───────────────────────────┐  │
│ │     Fit to Background     │  │
│ └───────────────────────────┘  │
│ Resize image to fill canvas    │
├─────────────────────────────────┤
│ Zoom                           │
│ ●────────────────────────  [0%]│
├─────────────────────────────────┤
│ Campaign                       │
│ [ Vibit                    ▼]  │
├─────────────────────────────────┤
│ Collection                     │
│ ┌───────────────────────────┐  │
│ │ 🔍 lifes                  │  │
│ └───────────────────────────┘  │
│                                │
│ lifestyle ✕                    │
│ spain-lifestyle ✕              │
│ men-lifestyle ✕                │
│ women-lifestyle ✕              │
│ girl-lifestyle ✕               │
│ tourist-lifestyle ✕            │
│                                │
│ ┌───┐┌───┐┌───┐┌───┐          │
│ │🖼️││🖼️││🖼️││🖼️│          │
│ └───┘└───┘└───┘└───┘          │
│ ┌───┐┌───┐┌───┐┌───┐          │
│ │🖼️││🖼️││🖼️││🖼️│          │
│ └───┘└───┘└───┘└───┘          │
├─────────────────────────────────┤
│ Image Metadata            [▼]  │
└─────────────────────────────────┘
```

**Properties:**

- `left`, `top`: position
- `width`, `height`: dimensions (after scale)
- `scaleX`, `scaleY`: scale factors
- `angle`: rotation in degrees
- `src`: image URL
- `cropX`, `cropY`, `cropWidth`, `cropHeight`: cropping (future)

**Custom Properties (stored in object.data):**

- `collectionId`: string | null - Linked collection for this image slot
- `isPlaceholder`: boolean - Is this a template variable (swappable)?
- `placeholderLabel`: string - User-friendly name ('Background Image', 'Product Shot')
- `originalSrc`: string - Original URL before any swaps (for reset)

**Alignment with Template System (from TEMPLATE_FEATURE_PLAN.md):**

```typescript
// In templates, images are linked to Collections
interface TemplateSlide {
  backgroundCollectionId: string; // Collection to pull images from
  backgroundImageUrl?: string; // Default preview image
}

// In slideshows, images are concrete (copied from template)
interface SlideshowSlide {
  backgroundImageUrl: string; // Actual image for THIS slideshow
}
```

**Actions:**

- **Fit to Background**: Scale image to cover canvas (current behavior)
- **Collection picker**: Browse and swap images from linked collection
- **Zoom**: Scale image up/down from center
- **Reset**: Restore original image from `originalSrc`

**Image Loading (preserve current approach):**

```typescript
// Must use backend proxy for CORS
const API_URL = process.env.NEXT_PUBLIC_API_URL;
const proxiedUrl = `${API_URL}/api/generate-image/proxy?url=${encodeURIComponent(src)}`;

// Fabric.js loading
fabric.Image.fromURL(
  proxiedUrl,
  (img) => {
    canvas.add(img);
  },
  { crossOrigin: 'anonymous' }
);
```

### 3. Per-Line Text Backgrounds (TikTok Style)

The current implementation renders **individual rounded rectangles behind each line** of text, not one box around all text. This is the signature TikTok/Instagram text style.

**Current Implementation (must preserve):**

```typescript
// From useCanvasRenderer.ts
allLines.forEach((line, index) => {
  const lineY = startY + index * lineHeight;

  if (backgroundColor && line.trim()) {
    // Each line gets its own background box
    const metrics = ctx.measureText(line);
    const lineWidth = metrics.width;
    const paddingX = scaledFontSize * 0.4;
    const paddingY = scaledFontSize * 0.15;
    const bgWidth = lineWidth + paddingX * 2;
    const bgHeight = scaledFontSize * 1.1;
    const radius = scaledFontSize * 0.15;

    ctx.fillStyle = backgroundColor;
    ctx.beginPath();
    ctx.roundRect(bgX, bgY, bgWidth, bgHeight, radius);
    ctx.fill();
  }
});
```

**Fabric.js Implementation Options:**

1. **Custom Fabric Class** (recommended):

   ```typescript
   // Create TikTokText class extending fabric.IText
   class TikTokText extends fabric.IText {
     _renderTextLinesBackground(ctx: CanvasRenderingContext2D) {
       // Override to render per-line backgrounds
     }
   }
   ```

2. **Group with Rects + IText**:

   - Create group with one `fabric.Rect` per line + one `fabric.IText`
   - Update rects on text change
   - More complex state management

3. **Post-render hook**:
   - Override `_render` to draw backgrounds before text
   - May have z-index issues

**Recommendation**: Custom `TikTokText` class for cleanest implementation.

---

### 4. Layers Panel (Always Visible)

```
┌─────────────────────────────────┐
│ Layers                     [▲]  │
├─────────────────────────────────┤
│ 👁️ [≡] text-f7642938129086    │
│ 👁️ [≡] image-f7642938f0379    │
│ 🔒 [≡] Background              │
└─────────────────────────────────┘
```

**Features:**

- List all objects in z-order (top = front)
- Drag to reorder (updates z-index)
- Eye icon: Toggle visibility
- Lock icon: Background is always locked
- Click to select object on canvas
- Double-click to rename (custom label)

**Background Layer Behavior:**

- Always at bottom (z-index 0)
- Cannot be deleted
- Cannot be moved or reordered
- Can only change color or swap image
- Competitor shows: "Background is locked and cannot be moved or deleted"

### 5. Toolbar (Top/Left)

```
┌──────────────────────────────────────────────────────────────────┐
│ ← Untitled Scene    ⚙️ 🎵  Randomize Images  Save As Template    │
│                           Add Overlay  All Slides  This Slide   │
└──────────────────────────────────────────────────────────────────┘

┌───┐
│ T │  Add Text
├───┤
│ 🖼️│  Add Image
└───┘
```

**Actions:**

- **T (Add Text)**: Insert new IText at center
- **🖼️ (Add Image)**: Open image picker, insert at center
- **Randomize Images**: Swap all images from their collections
- **Save As Template**: Save current state as template
- **Add Overlay**: Add preset overlay shapes
- **All Slides / This Slide**: Apply changes to all or current

### 6. Additional Features to Implement

#### A. Template Variables

Images and text can be marked as "template variables" - placeholders that get filled during generation.

```typescript
interface TemplateVariable {
  objectId: string; // Fabric object ID
  type: 'image' | 'text';
  label: string; // "Image 1", "Title", "Subtitle"
  collectionId?: string; // For images: which collection to pull from
  aiPrompt?: string; // For text: instruction for AI generation
}
```

Display at bottom of editor:

```
┌─────────────────────────────────────────────────────┐
│ Template Variables (3)                         [⚙️] │
└─────────────────────────────────────────────────────┘
```

#### B. Keyboard Shortcuts

| Key              | Action                 |
| ---------------- | ---------------------- |
| Delete/Backspace | Delete selected object |
| Cmd+C            | Copy object            |
| Cmd+V            | Paste object           |
| Cmd+D            | Duplicate object       |
| Cmd+Z            | Undo                   |
| Cmd+Shift+Z      | Redo                   |
| Cmd+A            | Select all             |
| Escape           | Deselect all           |
| Arrow keys       | Move selected by 1px   |
| Shift+Arrow      | Move selected by 10px  |
| [                | Send backward          |
| ]                | Bring forward          |
| Shift+[          | Send to back           |
| Shift+]          | Bring to front         |

#### C. Snap & Alignment

- Snap to center guides (horizontal/vertical)
- Snap to other objects' edges
- Alignment buttons (when multiple selected):
  - Align left/center/right
  - Align top/middle/bottom
  - Distribute horizontally/vertically

#### D. Zoom & Pan

- Zoom slider / scroll wheel
- "Fit to Scene" button
- Pan with spacebar + drag
- Zoom percentage display

#### E. Export (Preserve Current Functionality)

```typescript
// Current export from useCanvasRenderer.ts
const exportToBlob = async (
  imageUrl: string | null,
  textBoxes: TextBox[],
  options: {
    width?: number;       // Default: 1080
    height?: number;      // Default: 1920
    format?: 'image/png' | 'image/jpeg' | 'image/webp';
    quality?: number;     // Default: 0.95
  }
): Promise<Blob | null>

// Fabric.js equivalent
const exportToBlob = async (canvas: fabric.Canvas): Promise<Blob | null> => {
  // Scale up to export dimensions
  const multiplier = EXPORT_WIDTH / canvas.getWidth();
  const dataUrl = canvas.toDataURL({
    format: 'png',
    quality: 0.95,
    multiplier,
  });
  // Convert to blob...
};
```

**Export Requirements:**

- Preview at 405×720, export at 1080×1920 (9:16 TikTok)
- Scale factor: 2.67x
- Fonts must scale correctly
- Per-line backgrounds must scale correctly
- Image quality preserved

---

## Data Structures

### Canvas JSON Schema

Fabric.js provides `canvas.toJSON()` but we extend it to match the Template system:

```typescript
interface SlideCanvasData {
  version: string; // Fabric.js version
  width: number; // Canvas width (default: 1080)
  height: number; // Canvas height (default: 1920)
  backgroundColor: string; // Canvas background color
  backgroundImage?: string; // Background image URL (if using image instead of color)
  objects: FabricObjectData[];

  // Custom extensions for template system
  metadata: {
    createdAt: string;
    updatedAt: string;

    // Template variables for AI substitution
    templateVariables: TemplateVariable[];

    // Collection links (for templates only)
    linkedCollections: {
      objectId: string; // Which object this is for
      collectionId: string; // Which collection it pulls from
    }[];
  };
}

interface FabricObjectData {
  type: 'image' | 'i-text' | 'textbox' | 'tiktok-text' | 'rect';
  version: string;

  // Common properties
  left: number; // Was x (percentage) in old system, now pixels
  top: number; // Was y (percentage) in old system, now pixels
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  angle: number;
  opacity: number;
  visible: boolean;
  selectable: boolean;

  // Type-specific properties
  // For text (TikTokText or IText):
  text?: string;
  fontFamily?: string; // Current default: 'Inter, system-ui, sans-serif'
  fontSize?: number; // Current default: 24
  fontWeight?: string | number; // Current: always 'bold'
  fill?: string; // Text color (was 'color')
  textAlign?: 'left' | 'center' | 'right'; // Current default: 'center'
  charSpacing?: number; // Letter spacing
  textBackgroundColor?: string | null; // Per-line background (TikTok style)
  stroke?: string; // Outline color
  strokeWidth?: number;
  shadow?: fabric.Shadow; // Only when no background

  // For image:
  src?: string;
  crossOrigin?: 'anonymous' | 'use-credentials';

  // Custom data (stored in object.data)
  data?: {
    id: string; // Our internal ID (e.g., 'text-1704067200000')
    label?: string; // User-friendly name for layers panel

    // Template variables
    isPlaceholder?: boolean; // Is this a template variable?
    variableName?: string; // For AI substitution (e.g., 'headline')
    defaultText?: string; // Original text before AI fills it

    // Image-specific
    collectionId?: string | null; // Linked collection
    originalSrc?: string; // For reset functionality

    // State
    locked?: boolean; // Cannot move/resize (background only)

    // Color cycling state (for text)
    colorCycle?: {
      baseColor: string; // One of 5 preset colors
      variantIndex: number; // 0, 1, or 2
    };
  };
}
```

### Slide Model Update

```typescript
interface Slide {
  id: string;
  order: number;

  // OLD (deprecated):
  // backgroundImage?: string;
  // textBoxes: TextBox[];

  // NEW: Full Fabric.js canvas state
  canvasData: SlideCanvasData;

  // Thumbnail for preview
  thumbnail?: string; // Base64 or URL
}
```

---

## Component Architecture

```
frontend/src/components/editor/
├── FabricCanvas/
│   ├── index.tsx                    # Main canvas component
│   ├── FabricCanvas.tsx             # Canvas wrapper
│   ├── useFabricCanvas.ts           # Canvas initialization hook
│   ├── useCanvasHistory.ts          # Undo/redo state management
│   ├── useKeyboardShortcuts.ts      # Keyboard event handlers
│   ├── useObjectSelection.ts        # Selection state sync
│   └── types.ts                     # TypeScript definitions
│
├── PropertiesPanel/
│   ├── index.tsx                    # Panel container (switches by selection)
│   ├── SceneProperties.tsx          # When nothing/background selected
│   ├── TextProperties.tsx           # When text selected
│   ├── ImageProperties.tsx          # When image selected
│   ├── TextStylePresets.tsx         # Style preset picker
│   └── CollectionPicker.tsx         # Image collection browser
│
├── LayersPanel/
│   ├── index.tsx                    # Layers list
│   ├── LayerItem.tsx                # Single layer row
│   └── useDragReorder.ts            # Drag-to-reorder hook
│
├── Toolbar/
│   ├── index.tsx                    # Top toolbar
│   ├── AddTextButton.tsx
│   ├── AddImageButton.tsx
│   ├── ZoomControls.tsx
│   └── ActionButtons.tsx            # Save, Randomize, etc.
│
└── shared/
    ├── ColorPicker.tsx              # Reusable color input
    ├── NumberInput.tsx              # Reusable number field
    ├── SliderInput.tsx              # Reusable slider
    └── AlignmentButtons.tsx         # Alignment button group
```

---

## Implementation Phases

### Phase 1: Core Canvas Setup (Foundation)

**Goal**: Get Fabric.js rendering with basic object manipulation

1. Install dependencies:

   ```bash
   npm install fabric
   npm install -D @types/fabric
   ```

2. Create `FabricCanvas` component:

   - Initialize canvas with Fabric.js
   - Set canvas dimensions (1080x1920 default)
   - Handle canvas resize/zoom
   - Implement "Fit to Scene" view

3. Object creation:

   - Add text (IText) with double-click to edit
   - Add image from URL
   - Background rectangle (locked)

4. Selection handling:
   - Track `selection:created`, `selection:updated`, `selection:cleared`
   - Expose selected object(s) to React state

**Deliverables:**

- [ ] `useFabricCanvas.ts` hook
- [ ] Basic canvas rendering
- [ ] Add/select/delete objects
- [ ] Canvas JSON export/import

### Phase 2: Properties Panel (Context-Sensitive)

**Goal**: Edit object properties through UI

1. Panel switching logic:

   - No selection → SceneProperties
   - Text selected → TextProperties
   - Image selected → ImageProperties

2. SceneProperties:

   - Dimension presets (9:16, 3:4, etc.)
   - Custom width/height
   - Background color picker

3. TextProperties:

   - Transform inputs (x, y, width, height)
   - Text content textarea
   - Font family dropdown
   - Font size slider
   - Font weight dropdown
   - Color picker
   - Alignment buttons (horizontal + vertical)
   - Letter spacing slider

4. ImageProperties:
   - Transform inputs
   - "Fit to Background" button
   - Zoom slider

**Deliverables:**

- [ ] `PropertiesPanel/index.tsx` with switching
- [ ] `SceneProperties.tsx`
- [ ] `TextProperties.tsx`
- [ ] `ImageProperties.tsx`
- [ ] Two-way binding (panel ↔ canvas)

### Phase 3: Layers Panel

**Goal**: Visual layer management

1. Layer list:

   - Show all objects in z-order
   - Display object type icon + label
   - Background always at bottom, locked

2. Interactions:
   - Click to select
   - Drag to reorder (updates z-index)
   - Toggle visibility (eye icon)
   - Highlight selected layer

**Deliverables:**

- [ ] `LayersPanel/index.tsx`
- [ ] Drag-to-reorder with `@dnd-kit/core`
- [ ] Visibility toggle
- [ ] Selection sync

### Phase 4: Advanced Features

**Goal**: Production-ready editor

1. History (Undo/Redo):

   - State snapshots on change
   - Cmd+Z / Cmd+Shift+Z
   - History limit (50 states)

2. Keyboard shortcuts:

   - Delete, copy, paste, duplicate
   - Arrow key movement
   - Layer ordering shortcuts

3. Snap & guides:

   - Center guides
   - Object edge snapping
   - Smart guides

4. Zoom & pan:
   - Scroll wheel zoom
   - Spacebar + drag to pan
   - Zoom slider
   - Fit to screen

**Deliverables:**

- [ ] `useCanvasHistory.ts`
- [ ] `useKeyboardShortcuts.ts`
- [ ] Snapping system
- [ ] Zoom/pan controls

### Phase 5: Template Variables & Collection Integration

**Goal**: Connect to template system

1. Mark objects as placeholders:

   - Right-click → "Mark as Template Variable"
   - Show variable badge on object
   - List variables in bottom bar

2. Image collection picker:

   - Search collections
   - Filter by tags
   - Grid view of images
   - Click to swap image

3. Randomize images:
   - For each image placeholder
   - Pick random from linked collection
   - Apply to current/all slides

**Deliverables:**

- [ ] Template variable system
- [ ] `CollectionPicker.tsx`
- [ ] Randomize functionality
- [ ] Collection linking UI

### Phase 6: Text Style Presets

**Goal**: Save and apply text styles

1. Built-in presets:

   - Classic TikTok BG
   - Classic TikTok White
   - More TikTok-style presets

2. Custom presets:
   - "Save as Preset" button
   - User preset library
   - Apply preset to selection

**Deliverables:**

- [ ] `TextStylePresets.tsx`
- [ ] Preset data model
- [ ] Save/load presets API

---

## Integration Points

### With Template System

```typescript
// When saving a template slide
const saveSlide = async (fabricCanvas: fabric.Canvas) => {
  const canvasData = fabricCanvas.toJSON(['data']); // Include custom data
  const thumbnail = fabricCanvas.toDataURL({ format: 'png', quality: 0.5 });

  await api.patch(`/templates/${templateId}/slides/${slideId}`, {
    canvasData,
    thumbnail,
  });
};

// When loading a template slide
const loadSlide = async (slideId: string) => {
  const { canvasData } = await api.get(`/slides/${slideId}`);
  await fabricCanvas.loadFromJSON(canvasData);
  fabricCanvas.renderAll();
};
```

### With Slideshow Generation

```typescript
// Generate slideshow from template
const generateSlideshow = async (templateId: string, productId: string) => {
  // 1. Copy template structure
  // 2. For each slide:
  //    - Replace image placeholders with product/collection images
  //    - Generate text for text placeholders using AI
  // 3. Save as new slideshow
};
```

---

## File Structure

```
frontend/src/
├── components/
│   └── editor/
│       ├── FabricCanvas/
│       │   ├── index.tsx
│       │   ├── FabricCanvas.tsx
│       │   ├── useFabricCanvas.ts
│       │   ├── useCanvasHistory.ts
│       │   ├── useKeyboardShortcuts.ts
│       │   ├── useObjectSelection.ts
│       │   ├── useSnapping.ts
│       │   ├── constants.ts          # Dimension presets, defaults
│       │   └── types.ts
│       │
│       ├── PropertiesPanel/
│       │   ├── index.tsx
│       │   ├── SceneProperties.tsx
│       │   ├── TextProperties.tsx
│       │   ├── ImageProperties.tsx
│       │   ├── TextStylePresets.tsx
│       │   └── CollectionPicker.tsx
│       │
│       ├── LayersPanel/
│       │   ├── index.tsx
│       │   ├── LayerItem.tsx
│       │   └── useDragReorder.ts
│       │
│       ├── Toolbar/
│       │   ├── index.tsx
│       │   ├── AddObjectButtons.tsx
│       │   ├── ZoomControls.tsx
│       │   └── ActionButtons.tsx
│       │
│       └── shared/
│           ├── ColorPicker.tsx
│           ├── NumberInput.tsx
│           ├── SliderInput.tsx
│           ├── FontPicker.tsx
│           └── AlignmentButtons.tsx
│
├── lib/
│   └── fabric/
│       ├── setup.ts               # Fabric.js configuration
│       ├── customControls.ts      # Custom selection controls
│       └── serialization.ts       # JSON helpers
│
└── types/
    └── fabric.d.ts                # Extended Fabric types
```

---

## Technical Considerations

### 1. Fabric.js Version

Use Fabric.js v6 (latest stable):

```bash
npm install fabric@^6.0.0
```

### 2. Canvas Performance

- Use `objectCaching: true` (default) for complex objects
- Limit canvas size for mobile devices
- Use `renderOnAddRemove: false` during batch operations
- Debounce property updates from sliders

### 3. Image Loading

```typescript
// Always use crossOrigin for external images
fabric.Image.fromURL(
  url,
  (img) => {
    canvas.add(img);
  },
  { crossOrigin: 'anonymous' }
);
```

### 4. Font Loading

```typescript
// Preload custom fonts before using
await document.fonts.load('bold 48px "TikTok Display"');
canvas.renderAll(); // Re-render after fonts load
```

### 5. Mobile Support

- Touch events work out of the box
- Consider larger touch targets for handles
- May need simplified UI for mobile

---

## Migration from Current Canvas

### Current Implementation (Keep for Reference)

Location: `frontend/src/components/slideshow/CanvasEditor/`

| Current Feature      | Fabric.js Equivalent      |
| -------------------- | ------------------------- |
| `useCanvasRenderer`  | `useFabricCanvas`         |
| `TextBox` type       | `fabric.IText` object     |
| Manual drag handlers | Built-in object controls  |
| Manual selection     | Built-in selection events |
| Custom JSON format   | `canvas.toJSON()`         |

### Migration Strategy

1. **Don't migrate** - build new editor from scratch
2. Keep old canvas code for reference
3. New templates use new format
4. Old slideshows remain functional (legacy)

---

## Testing Checklist

### Unit Tests

- [ ] Canvas initialization
- [ ] Object CRUD operations
- [ ] JSON serialization/deserialization
- [ ] History (undo/redo)
- [ ] Property updates

### Integration Tests

- [ ] Save template slide
- [ ] Load template slide
- [ ] Generate slideshow from template
- [ ] Collection image swapping

### E2E Tests

- [ ] Add text, edit, style, position
- [ ] Add image, resize, reposition
- [ ] Reorder layers
- [ ] Keyboard shortcuts
- [ ] Zoom/pan navigation

---

## Summary

This plan provides a complete Fabric.js-based canvas editor with:

1. **Object manipulation** - drag, resize, rotate with built-in controls
2. **Context-sensitive properties** - different panels for scene/text/image
3. **Layer management** - visual reordering, visibility toggle
4. **Template variables** - mark objects as placeholders
5. **Collection integration** - swap images from linked collections
6. **Style presets** - save and apply text styles
7. **History** - full undo/redo support
8. **Keyboard shortcuts** - professional editing workflow

### Preserved from Current Implementation

| Current Feature                          | Status                                   |
| ---------------------------------------- | ---------------------------------------- |
| Per-line text backgrounds (TikTok style) | ✅ Custom TikTokText class               |
| 5-color cycling system                   | ✅ Preserved in properties panel         |
| Text shadow (only without bg)            | ✅ Conditional shadow                    |
| Export at 1080×1920                      | ✅ Fabric.js multiplier                  |
| Image proxy for CORS                     | ✅ Same backend proxy                    |
| Preview at 405×720                       | ✅ Same dimensions                       |
| Double-click to edit text                | ✅ IText built-in                        |
| Percentage-based positioning             | 🔄 Converted to pixels (Fabric standard) |

### Alignment with Template System

| Template Feature             | Fabric.js Support                 |
| ---------------------------- | --------------------------------- |
| `variableName` on text boxes | ✅ `object.data.variableName`     |
| `backgroundCollectionId`     | ✅ `object.data.collectionId`     |
| AI text substitution         | ✅ Replace `text` property        |
| Random image from collection | ✅ Swap `src` property            |
| Full copy to slideshow       | ✅ `canvas.toJSON()` → deep clone |

Implement **after** the Template Feature Plan data layer is complete.
