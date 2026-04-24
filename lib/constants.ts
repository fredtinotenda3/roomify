// FILE: C:\Users\user\Desktop\roomify\lib\constants.ts

export const PUTER_WORKER_URL = import.meta.env.VITE_PUTER_WORKER_URL || "";

// Storage Paths
export const STORAGE_PATHS = {
    ROOT: "roomify",
    SOURCES: "roomify/sources",
    RENDERS: "roomify/renders",
} as const;

// Timing Constants (in milliseconds)
export const SHARE_STATUS_RESET_DELAY_MS = 1500;
export const PROGRESS_INCREMENT = 15;
export const REDIRECT_DELAY_MS = 600;
export const PROGRESS_INTERVAL_MS = 100;
export const PROGRESS_STEP = 5;

// UI Constants
export const GRID_OVERLAY_SIZE = "60px 60px";
export const GRID_COLOR = "#3B82F6";

// HTTP Status Codes
export const UNAUTHORIZED_STATUSES = [401, 403];

// Image Dimensions
export const IMAGE_RENDER_DIMENSION = 1024;

// Style Types
export type DesignStyle = 'modern' | 'rustic' | 'industrial' | 'scandinavian' | 'bohemian';

export const STYLE_OPTIONS: { id: DesignStyle; name: string; icon: string; description: string }[] = [
    {
        id: 'modern',
        name: 'Modern',
        icon: '🏢',
        description: 'Clean lines, minimal decor, neutral colors'
    },
    {
        id: 'rustic',
        name: 'Rustic',
        icon: '🏡',
        description: 'Wood textures, warm tones, natural materials'
    },
    {
        id: 'industrial',
        name: 'Industrial',
        icon: '🏭',
        description: 'Exposed brick, metal accents, urban loft style'
    },
    {
        id: 'scandinavian',
        name: 'Scandinavian',
        icon: '❄️',
        description: 'Light wood, bright spaces, hygge-inspired'
    },
    {
        id: 'bohemian',
        name: 'Bohemian',
        icon: '🌿',
        description: 'Eclectic patterns, plants, artistic vibes'
    }
];

// Base prompt template
const BASE_RENDER_PROMPT = `
TASK: Convert the input 2D floor plan into a **photorealistic, top-down 3D architectural render**.

STRICT REQUIREMENTS (do not violate):
1) **REMOVE ALL TEXT**: Do not render any letters, numbers, labels, dimensions, or annotations. Floors must be continuous where text used to be.
2) **GEOMETRY MUST MATCH**: Walls, rooms, doors, and windows must follow the exact lines and positions in the plan. Do not shift or resize.
3) **TOP-DOWN ONLY**: Orthographic top-down view. No perspective tilt.
4) **CLEAN, REALISTIC OUTPUT**: Crisp edges, balanced lighting, and realistic materials. No sketch/hand-drawn look.
5) **NO EXTRA CONTENT**: Do not add rooms, furniture, or objects that are not clearly indicated by the plan.

STRUCTURE & DETAILS:
- **Walls**: Extrude precisely from the plan lines. Consistent wall height and thickness.
- **Doors**: Convert door swing arcs into open doors, aligned to the plan.
- **Windows**: Convert thin perimeter lines into realistic glass windows.

FURNITURE & ROOM MAPPING (only where icons/fixtures are clearly shown):
- Bed icon → realistic bed with duvet and pillows.
- Sofa icon → modern sectional or sofa.
- Dining table icon → table with chairs.
- Kitchen icon → counters with sink and stove.
- Bathroom icon → toilet, sink, and tub/shower.
- Office/study icon → desk, chair, and minimal shelving.
- Porch/patio/balcony icon → outdoor seating or simple furniture (keep minimal).
- Utility/laundry icon → washer/dryer and minimal cabinetry.

STYLE REQUIREMENTS:
`;

// Style-specific prompts
export const STYLE_PROMPTS: Record<DesignStyle, string> = {
    modern: `
MODERN STYLE:
- Materials: Smooth surfaces, glass, steel, polished concrete
- Colors: Neutral palette (whites, grays, blacks) with bold accent colors
- Furniture: Minimalist, geometric shapes, sleek finishes
- Lighting: Clean, bright, even illumination with subtle shadows
- Decor: Minimal decorative elements, focus on clean lines
- Flooring: Polished concrete, large format tiles, light hardwood
    `.trim(),

    rustic: `
RUSTIC STYLE:
- Materials: Natural wood, stone, exposed beams, wrought iron
- Colors: Warm earth tones (browns, beiges, deep greens)
- Furniture: Farmhouse style, distressed finishes, comfortable pieces
- Lighting: Warm, cozy illumination, pendant lights, sconces
- Decor: Vintage accessories, woven textiles, fireplace emphasis
- Flooring: Wide plank hardwood, natural stone, hand-scraped finishes
    `.trim(),

    industrial: `
INDUSTRIAL STYLE:
- Materials: Exposed brick, concrete, metal pipes, reclaimed wood
- Colors: Dark neutrals (charcoal, black, gray) with warm metallic accents
- Furniture: Utilitarian, metal frames, leather upholstery, exposed hardware
- Lighting: Edison bulbs, track lighting, metal shades, dramatic shadows
- Decor: Minimal, functional, warehouse aesthetic
- Flooring: Polished concrete, distressed wood, epoxy finishes
    `.trim(),

    scandinavian: `
SCANDINAVIAN STYLE:
- Materials: Light woods (birch, oak, pine), wool, leather, ceramics
- Colors: White, light gray, pastel accents, muted tones
- Furniture: Functional, simple forms, tapered legs, organic shapes
- Lighting: Soft, diffused, natural light maximized, simple pendant fixtures
- Decor: Hygge elements (candles, throws), plants, minimalist art
- Flooring: Light wood floors, white-washed, large windows
    `.trim(),

    bohemian: `
BOHEMIAN STYLE:
- Materials: Natural fibers (rattan, jute, macrame), velvet, wood
- Colors: Rich jewel tones, warm earth colors, eclectic patterns
- Furniture: Mix of vintage and global pieces, low seating, floor cushions
- Lighting: Warm ambient, string lights, lanterns, stained glass
- Decor: Plants everywhere, tapestries, patterned rugs, collected objects
- Flooring: Layered rugs, patterned tiles, natural wood
    `.trim()
};

export const ROOMIFY_RENDER_PROMPT = `${BASE_RENDER_PROMPT}\n${STYLE_PROMPTS.modern}`.trim();

export const getStylePrompt = (style: DesignStyle): string => {
    return `${BASE_RENDER_PROMPT}\n${STYLE_PROMPTS[style]}`.trim();
};

export const getStyleName = (styleId: DesignStyle): string => {
    const style = STYLE_OPTIONS.find(s => s.id === styleId);
    return style?.name || styleId;
};

export const getStyleIcon = (styleId: DesignStyle): string => {
    const style = STYLE_OPTIONS.find(s => s.id === styleId);
    return style?.icon || '🎨';
};

export const getStyleDescription = (styleId: DesignStyle): string => {
    const style = STYLE_OPTIONS.find(s => s.id === styleId);
    return style?.description || '';
};

// Import presets for combined prompts
import { DESIGN_PRESETS, type PresetCategory } from './presets';

export type { PresetCategory };
export { DESIGN_PRESETS };

export const getStylePromptWithPreset = (style: DesignStyle, presetId: PresetCategory): string => {
    const preset = DESIGN_PRESETS.find(p => p.id === presetId);
    const basePrompt = getStylePrompt(style);
    
    if (!preset) return basePrompt;
    
    return `${basePrompt}\n\nADDITIONAL PRESET REQUIREMENTS (${preset.name}):\n${preset.promptAdditions}`;
};