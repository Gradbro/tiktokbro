# Template Feature - Complete Plan

> ⚠️ **IMPORTANT**: This plan covers ONLY the template data layer, API, and UI pages/flows.
>
> **DO NOT** implement any canvas/editor functionality from this plan.
>
> The canvas editor (Fabric.js) is covered in a **separate plan**: `FABRIC_EDITOR_PLAN.md`
>
> Implementation order:
>
> 1. Complete this Template Feature Plan first (data, API, pages)
> 2. Then implement the Fabric.js Editor Plan
> 3. Finally, integrate the editor into template/slideshow pages

---

## Overview

This document summarizes the complete plan for rebuilding ShortsBro's slideshow system with a **Template-based architecture**. This enables users to create reusable templates and generate multiple slideshows from them.

### Problem with Current System

- Each slideshow is created from scratch
- Importing a TikTok = 1 slideshow (wasteful)
- No reusability of structure
- AI analysis repeated every time

### New System

- **Template** = reusable structure (slide count, text positions, linked collections)
- **Slideshow** = generated output (specific images, final text)
- 1 template → unlimited slideshows
- AI analysis done once, reused forever

---

## Data Models

### 1. Image

Individual image entity, stored separately for reuse.

```typescript
interface Image {
  id: string;
  userId: string;
  url: string;
  source: 'pinterest' | 'upload';
  pinterestPinUrl?: string;
  createdAt: Date;
}
```

### 2. Collection

A bank of images grouped by aesthetic/purpose.

```typescript
interface Collection {
  id: string;
  userId: string;
  name: string; // "Beach Aesthetic"
  imageIds: string[]; // References to Image entities
  createdAt: Date;
  updatedAt: Date;
}
```

### 3. Product

Products/topics that slideshows can be generated for.

```typescript
interface Product {
  id: string;
  userId: string;
  name: string; // "PrepGenius SAT Course"
  description: string; // Full description for AI context
  url?: string; // Product link
  createdAt: Date;
  updatedAt: Date;
}
```

### 4. Template

Reusable structure definition.

```typescript
interface Template {
  id: string;
  userId: string;
  name: string;

  source?: {
    type: 'tiktok' | 'scratch';
    url?: string;
    authorName?: string;
  };

  slides: TemplateSlide[];

  thumbnailUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface TemplateSlide {
  id: string;
  position: number;

  width: number; // 1080
  height: number; // 1920

  // Background
  backgroundCollectionId: string;
  backgroundImageUrl?: string; // Default preview

  // Text boxes
  textBoxes: TemplateTextBox[];
}

interface TemplateTextBox {
  id: string;
  defaultText: string; // "how i got into ivy"
  variableName: string; // "headline" - for AI substitution

  // Position
  x: number; // percentage
  y: number; // percentage

  // Style
  fontSize: number;
  fontFamily: string;
  color: string;
  backgroundColor: string | null;
  textAlign: 'left' | 'center' | 'right';
}
```

### 5. Slideshow

Generated output - FULL COPY, independently editable.

```typescript
interface Slideshow {
  id: string;
  userId: string;
  templateId: string; // Reference only (not a dependency)
  productId?: string; // References Product
  name: string;

  slides: SlideshowSlide[];

  createdAt: Date;
  updatedAt: Date;
}

interface SlideshowSlide {
  id: string;
  position: number;

  width: number;
  height: number;

  // Background - actual image for THIS slideshow
  backgroundImageUrl: string;

  // Text boxes - full data, independently editable
  textBoxes: SlideshowTextBox[];

  // Export
  exportedImageUrl?: string;
}

interface SlideshowTextBox {
  id: string;
  text: string; // Actual text

  // Position (can differ from template)
  x: number;
  y: number;

  // Style (can differ from template)
  fontSize: number;
  fontFamily: string;
  color: string;
  backgroundColor: string | null;
  textAlign: 'left' | 'center' | 'right';
}
```

---

## Key Design Decisions

| Decision                        | Rationale                                                                    |
| ------------------------------- | ---------------------------------------------------------------------------- |
| **Image as separate entity**    | Images can be reused across collections, tracked individually                |
| **Collections are user-global** | Reusable across templates, not tied to one template                          |
| **Product as separate entity**  | Multiple slideshows can reference same product                               |
| **Slideshow is full copy**      | Independence - editing slideshow doesn't affect template or other slideshows |
| **No layer system**             | TikTok format = background image + text boxes. Keep simple.                  |
| **Modal for new template**      | No need for separate page, keep user in context                              |
| **No status field**             | Can add later if needed                                                      |
| **Canvas editor is SEPARATE**   | See `FABRIC_EDITOR_PLAN.md` - not part of this plan                          |

---

## Relationship Diagram

```
┌─────────┐
│  Image  │◄────────────────┐
└─────────┘                 │
                            │ imageIds[]
┌─────────┐                 │
│ Product │                 │
└────┬────┘            ┌────┴──────┐
     │                 │ Collection │
     │ productId       └────┬──────┘
     │                      │
     │                      │ backgroundCollectionId
     ▼                      ▼
┌──────────┐  copied   ┌──────────┐
│ Slideshow│◄──────────│ Template │
│ (full    │  from     │ (source) │
│  data)   │           │          │
└──────────┘           └──────────┘
```

---

## User Flows

### Flow 1: Templates Home Page (Main Screen)

The main landing page showing all templates.

```
┌─────────────────────────────────────────────────────────────┐
│ Templates                                         [+ New]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ [thumbnail] │  │ [thumbnail] │  │ [thumbnail] │         │
│  │             │  │             │  │             │         │
│  │ @hailey     │  │ Morning     │  │ Study Tips  │         │
│  │ 6 slides    │  │ 5 slides    │  │ 7 slides    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
│  On hover:                                                  │
│  ┌─────────────────────────────┐                           │
│  │ ▶ Generate Slideshows      │                           │
│  │ ✏ Edit Template            │                           │
│  └─────────────────────────────┘                           │
└─────────────────────────────────────────────────────────────┘
```

### Flow 2: Create New Template (Modal)

User clicks [+ New] → Modal opens with 3 options:

```
┌─────────────────────────────────────────────────────────────┐
│                     Create Template                      ✕  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📥  Import from TikTok                             │   │
│  │      Paste a TikTok URL to clone its structure      │   │
│  │      [https://tiktok.com/@...                    ]  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│                         ── or ──                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ✨  Create from Prompt                             │   │
│  │      Describe what your template is about           │   │
│  │      [5 tips for studying, motivational quotes...]  │   │
│  │                                                     │   │
│  │      Number of slides:  [3] [5] [7] [10]           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│                         ── or ──                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🎨  Create from Scratch                            │   │
│  │      Start with a blank template                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│                              [Create Template]              │
└─────────────────────────────────────────────────────────────┘
```

**After creation:**

1. AI analyzes TikTok OR generates structure from prompt OR blank canvas
2. For each slide, AI generates Pinterest query
3. System auto-fetches 20 images per slide → creates Collection
4. Links Collection to slide
5. Opens Template Editor

### Flow 3: Template Editor

> ⚠️ **NOTE**: The actual canvas editor component is defined in `FABRIC_EDITOR_PLAN.md`.
> This flow describes the PAGE LAYOUT only. The `[Canvas Area]` will be implemented separately.

```
┌─────────────────────────────────────────────────────────────┐
│ ← Templates    @hailey - ivy league         [Save Template] │
├────────────────┬────────────────────────────┬───────────────┤
│ Slides         │       Canvas               │  Properties   │
│ ┌────┐         │  ┌──────────────────────┐  │               │
│ │ 1● │         │  │                      │  │  Background   │
│ ├────┤         │  │   [FABRIC.JS EDITOR] │  │  Collection:  │
│ │ 2  │         │  │   (See separate plan)│  │  [Beach ▼]    │
│ ├────┤         │  │                      │  │               │
│ │ 3  │         │  │                      │  │  ────────────  │
│ ├────┤         │  │                      │  │               │
│ │ 4  │         │  └──────────────────────┘  │  Text Box     │
│ ├────┤         │                            │  Variable:    │
│ │ 5  │         │                            │  [headline]   │
│ └────┘         │                            │  Font: [Inter]│
│                │                            │  Size: [48]   │
│ [+ Add Slide]  │                            │  Color: [#fff]│
├────────────────┴────────────────────────────┤  Align: [ctr] │
│ Collection: Beach Aesthetic (20 images)     │               │
│ [img][img][img][img][img][img]...           │  [+ Add Text] │
└─────────────────────────────────────────────┴───────────────┘
```

### Flow 4: Generate Slideshows (Modal)

User hovers on template → clicks "Generate Slideshows":

```
┌─────────────────────────────────────────────────────────────┐
│              Generate Slideshows                         ✕  │
│              from "@hailey - ivy league"                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  TEMPLATE PREVIEW                                           │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐     │
│  │  1   │ │  2   │ │  3   │ │  4   │ │  5   │ │  6   │     │
│  │"how i│ │"step │ │"step │ │"step │ │"resu │ │"link │     │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘     │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Product *                                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [Select a product...                            ▼]  │   │
│  │  • PrepGenius SAT Course                            │   │
│  │  • My Skincare Brand                                │   │
│  │  + Add new product                                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  How many variants?                                         │
│  [1]  [3]  [5]  [10]                                       │
│                                                             │
│                         [Generate Slideshows]               │
└─────────────────────────────────────────────────────────────┘
```

**Generation process:**

1. For each variant:
   - Pick random image from each slide's collection
   - AI rewrites each textBox using product context
   - Copy all position/style data
   - Create independent Slideshow record

### Flow 5: Slideshow Editor (Individual Editing)

> ⚠️ **NOTE**: The actual canvas editor component is defined in `FABRIC_EDITOR_PLAN.md`.
> This flow describes the PAGE LAYOUT only.

Each slideshow is fully editable independent of template:

```
┌─────────────────────────────────────────────────────────────┐
│ ← Slideshows   SAT Prep - Variant 1             [Export ▼]  │
├────────────────┬────────────────────────────────┬───────────┤
│ Slides         │       Canvas                   │ Properties│
│ ┌────┐         │  ┌──────────────────────┐      │           │
│ │ 1● │         │  │                      │      │ Image     │
│ ├────┤         │  │   [FABRIC.JS EDITOR] │      │ [Change]  │
│ │ 2  │         │  │   (See separate plan)│      │ [Upload]  │
│ ├────┤         │  │                      │      │           │
│ │ 3  │         │  │                      │      │ ──────────│
│ └────┘         │  │                      │      │           │
│                │  │                      │      │ Text      │
│                │  └──────────────────────┘      │ [Edit]    │
│                │                                │ Position  │
│                │                                │ Style     │
└────────────────┴────────────────────────────────┴───────────┘
```

User can:

- Change image (upload, pick from collection, Pinterest URL)
- Edit text
- Move text position
- Change text style
- Changes only affect THIS slideshow

---

## ⛔ Canvas Implementation - OUT OF SCOPE

> **DO NOT IMPLEMENT** any canvas/editor functionality from this plan.
>
> See `FABRIC_EDITOR_PLAN.md` for the complete Fabric.js editor implementation.
>
> This plan focuses ONLY on:
>
> - Data models
> - Backend API
> - Page layouts (without canvas)
> - User flows (without canvas interaction)
>
> The canvas editor will be built separately and integrated later.

---

## API Endpoints

### Images

```
POST   /api/images              — Upload image
GET    /api/images              — List user's images
DELETE /api/images/:id          — Delete image
```

### Collections

```
POST   /api/collections         — Create collection
GET    /api/collections         — List user's collections
GET    /api/collections/:id     — Get collection with images
PUT    /api/collections/:id     — Update (add/remove images)
DELETE /api/collections/:id     — Delete collection
```

### Products

```
POST   /api/products            — Create product
GET    /api/products            — List user's products
GET    /api/products/:id        — Get product
PUT    /api/products/:id        — Update product
DELETE /api/products/:id        — Delete product
```

### Templates

```
POST   /api/templates           — Create template
GET    /api/templates           — List user's templates
GET    /api/templates/:id       — Get template
PUT    /api/templates/:id       — Update template
DELETE /api/templates/:id       — Delete template
POST   /api/templates/:id/generate — Generate slideshows from template
```

### Slideshows

```
POST   /api/slideshows          — Create slideshow
GET    /api/slideshows          — List user's slideshows (filter by templateId)
GET    /api/slideshows/:id      — Get slideshow
PUT    /api/slideshows/:id      — Update slideshow
DELETE /api/slideshows/:id      — Delete slideshow
POST   /api/slideshows/:id/export — Export slideshow images
```

---

## Implementation Phases

> ⚠️ **REMINDER**: DO NOT implement canvas editor. See `FABRIC_EDITOR_PLAN.md`.

### Phase 1: Data Layer (Backend) ✅ COMPLETED

1. ✅ Create Image model + service + routes (`image.model.ts`, `image-entity.service.ts`, `image-library.routes.ts`)
2. ✅ Create Collection model + service + routes (`collection.model.ts`, `collection.service.ts`, `collection.routes.ts`)
3. ✅ Create Product model + service + routes (`product.model.ts`, `product.service.ts`, `product.routes.ts`)
4. ✅ Create Template model + service + routes (`template.model.ts`, `template.service.ts`, `template.routes.ts`)
5. ✅ Update Slideshow model (added `templateId`, `productId` fields)

### Phase 2: Templates Home Page (Frontend) ✅ COMPLETED

1. ✅ `/templates` page with grid layout (`frontend/src/app/templates/page.tsx`)
2. ✅ Template card component with hover actions
3. ✅ Create Template Modal (3 options: TikTok, prompt, scratch)
4. ✅ **Placeholder for canvas** — template editor page created with empty canvas placeholder

### Phase 3: Template Creation Flows (Backend + Frontend) ✅ COMPLETED

1. ✅ Import from TikTok flow (`templateService.createFromTikTok()`)
2. ✅ Create from prompt flow (`templateService.createFromPrompt()`)
3. ✅ Create from scratch flow (`templateService.createFromScratch()`)
4. ✅ Auto-create collections with Pinterest images (25 images per slide)

### Phase 4: Template Editor Page Layout (Frontend - NO CANVAS) ✅ COMPLETED

1. ✅ Page structure with 3-panel layout (`frontend/src/app/templates/[id]/page.tsx`)
2. ✅ Slides panel (left sidebar) — list/add/remove slides
3. ✅ **Canvas placeholder** (center) — shows "Fabric.js Coming in Phase 2"
4. ✅ Properties panel (right sidebar) — slide and textbox property forms
5. ✅ Save template API integration
6. ✅ Sidebar navigation updated (Templates link added)

### Phase 5: Generate Slideshows (Backend + Frontend) 🔜 NOT STARTED

1. Generate modal with product selection
2. AI text rewriting using product context
3. Random image selection from collections
4. Create independent slideshow records
5. List slideshows filtered by template

### Phase 6: Slideshow Editor Page Layout (Frontend - NO CANVAS) 🔜 NOT STARTED

1. Page structure similar to template editor
2. Slides panel
3. **Canvas placeholder** — empty container for Fabric.js later
4. Properties panel
5. Save slideshow API integration

### Phase 7: Collections Page (Optional - Later) 🔜 NOT STARTED

1. Collections list page
2. Create/edit collection
3. Add images (Pinterest search, upload)
4. Manage images

### Phase 8: Products Page (Optional - Later) 🔜 NOT STARTED

1. Products list page
2. Create/edit product
3. Product details for AI context

### 🔜 NEXT: Fabric.js Editor (SEPARATE PLAN)

After completing phases 1-6, implement the Fabric.js editor from `FABRIC_EDITOR_PLAN.md`, then integrate into:

- Template editor page (Phase 4 canvas placeholder)
- Slideshow editor page (Phase 6 canvas placeholder)

---

## Migration Strategy

### Existing Slideshows

Option A: Keep as-is, they work independently
Option B: Create templates from existing slideshows retroactively

Recommendation: **Option A** — don't migrate, let old slideshows live. New system runs parallel.

---

## File Structure (Frontend)

```
frontend/src/
├── app/
│   ├── templates/
│   │   ├── page.tsx              # Templates home
│   │   └── [id]/
│   │       └── page.tsx          # Template editor (canvas placeholder)
│   ├── slideshows/
│   │   ├── page.tsx              # Slideshows list
│   │   └── [id]/
│   │       └── page.tsx          # Slideshow editor (canvas placeholder)
│   ├── collections/
│   │   └── page.tsx              # Collections page (later)
│   └── products/
│       └── page.tsx              # Products page (later)
├── components/
│   ├── templates/
│   │   ├── TemplateCard.tsx
│   │   ├── CreateTemplateModal.tsx
│   │   ├── GenerateSlideshowsModal.tsx
│   │   └── TemplateEditor/
│   │       ├── index.tsx
│   │       ├── SlidesPanel.tsx
│   │       ├── PropertiesPanel.tsx
│   │       └── CanvasPlaceholder.tsx  # ⚠️ Placeholder until Fabric.js
│   ├── slideshow/
│   │   ├── CanvasEditor/         # OLD - Keep for reference only
│   │   └── SlideshowEditor/
│   │       ├── index.tsx
│   │       ├── SlidesPanel.tsx
│   │       ├── PropertiesPanel.tsx
│   │       └── CanvasPlaceholder.tsx  # ⚠️ Placeholder until Fabric.js
│   ├── collections/
│   │   ├── CollectionPicker.tsx
│   │   └── CollectionPreview.tsx
│   ├── products/
│   │   └── ProductPicker.tsx
│   └── editor/                    # ⚠️ FUTURE - Fabric.js (see separate plan)
│       └── FabricCanvas/          # Will be added from FABRIC_EDITOR_PLAN.md
└── types/
    └── index.ts                   # Updated with new types
```

---

## Summary

This template system transforms ShortsBro from a "one-shot" slideshow creator to a scalable content production tool:

1. **Templates** store reusable structure
2. **Collections** provide image banks
3. **Products** give AI context for customization
4. **Slideshows** are independent outputs, fully editable

Key principle: **Copy, don't reference** — slideshows are full copies that can be edited without affecting templates or other slideshows.

---

## ⚠️ Related Plans

| Plan                                   | Purpose                 | Status                 |
| -------------------------------------- | ----------------------- | ---------------------- |
| `TEMPLATE_FEATURE_PLAN.md` (this file) | Data models, API, pages | ✅ Phases 1-4 COMPLETE |
| `FABRIC_EDITOR_PLAN.md`                | Fabric.js canvas editor | 🔜 Ready to implement  |

**Phases 1-4 Complete**: All backend data layer, template creation flows, and frontend pages with canvas placeholders are done.

**Next Steps**:

1. Phase 5-6: Generate Slideshows flow (optional - can proceed to Fabric.js first)
2. Implement Fabric.js editor from `FABRIC_EDITOR_PLAN.md`
3. Replace canvas placeholders with actual Fabric.js editor

---

**Okay this plan is completed.**
