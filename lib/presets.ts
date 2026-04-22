// FILE: C:\Users\user\Desktop\roomify\lib\presets.ts

export type PresetCategory = 'luxury' | 'budget' | 'minimalist' | 'eclectic' | 'traditional';

export interface DesignPreset {
    id: PresetCategory;
    name: string;
    icon: string;
    description: string;
    priceTier: 'free' | 'premium';
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        walls: string;
        floor: string;
    };
    furniture: {
        style: string;
        pieces: string[];
        materials: string[];
    };
    lighting: string;
    decor: string[];
    promptAdditions: string;
}

export const DESIGN_PRESETS: DesignPreset[] = [
    {
        id: 'luxury',
        name: 'Luxury Estate',
        icon: '💎',
        description: 'High-end finishes, marble, gold accents, premium furniture',
        priceTier: 'premium',
        colors: {
            primary: '#C6A43F', // Gold
            secondary: '#2C2C2C', // Dark charcoal
            accent: '#8B0000', // Deep burgundy
            walls: '#F5F0E8', // Cream
            floor: '#8B7355' // Dark walnut
        },
        furniture: {
            style: 'Contemporary Luxury',
            pieces: ['Designer sofa', 'Marble coffee table', 'Velvet armchairs', 'Crystal chandelier'],
            materials: ['Marble', 'Velvet', 'Brass', 'Crystal', 'Leather']
        },
        lighting: 'Dramatic with statement chandeliers and hidden LED strips',
        decor: ['Large abstract art', 'Fresh flowers', 'Sculptural vases', 'Designer rugs'],
        promptAdditions: `
- PREMIUM LUXURY STYLE:
- Use high-end materials: marble, gold accents, crystal, velvet, polished brass
- Furniture: Designer pieces, tufted upholstery, sleek modern shapes
- Lighting: Elegant chandeliers, sconces, dramatic spotlights
- Colors: Rich jewel tones, metallics, deep warm neutrals
- Add decorative elements: fresh flowers, art pieces, sculptural objects
- Flooring: Polished marble, dark hardwood with inlays, premium wool rugs
- Create a sense of opulence and sophistication
        `.trim()
    },
    {
        id: 'budget',
        name: 'Budget Friendly',
        icon: '💰',
        description: 'Practical, functional, cost-effective solutions',
        priceTier: 'free',
        colors: {
            primary: '#4A90E2', // Blue
            secondary: '#F5F5F5', // White
            accent: '#50E3C2', // Mint
            walls: '#FFFFFF', // White
            floor: '#D2B48C' // Light oak
        },
        furniture: {
            style: 'IKEA-style Functional',
            pieces: ['Simple sofa', 'Flat-pack shelves', 'Multi-purpose table', 'Basic lighting'],
            materials: ['Particle board', 'Fabric', 'Plastic', 'Laminate', 'Glass']
        },
        lighting: 'Practical, energy-efficient LED with simple fixtures',
        decor: ['Minimal wall art', 'Potted plants', 'Simple curtains', 'Storage solutions'],
        promptAdditions: `
- BUDGET FRIENDLY STYLE:
- Materials: Laminate flooring, simple fabrics, basic wood finishes
- Furniture: Practical, functional designs, flat-pack aesthetic
- Colors: Neutral tones with minimal accent colors
- Keep designs simple and cost-effective
- Focus on utility and space efficiency
- Avoid expensive materials like marble, crystal, or premium woods
- Create a clean, organized, functional space
        `.trim()
    },
    {
        id: 'minimalist',
        name: 'Minimalist Zen',
        icon: '🎐',
        description: 'Clean lines, neutral tones, clutter-free spaces',
        priceTier: 'free',
        colors: {
            primary: '#E8E8E8',
            secondary: '#FFFFFF',
            accent: '#808080',
            walls: '#FFFFFF',
            floor: '#D3C5B5'
        },
        furniture: {
            style: 'Minimalist Japanese',
            pieces: ['Low-profile sofa', 'Simple wooden table', 'Floor cushions', 'Clean shelving'],
            materials: ['Natural wood', 'Cotton', 'Linen', 'Stone', 'Bamboo']
        },
        lighting: 'Soft, diffused natural light with simple paper lanterns',
        decor: ['Single statement plant', 'Simple ceramics', 'One art piece', 'Nothing excessive'],
        promptAdditions: `
- MINIMALIST ZEN STYLE:
- Clean lines, no clutter, empty space is valued
- Materials: Natural wood, stone, cotton, linen, bamboo
- Colors: White, beige, light gray, earth tones only
- Furniture: Low-profile, functional, simple geometric shapes
- Lighting: Soft, warm, diffused natural light
- Decor: Minimal, one or two statement pieces maximum
- Create a calm, peaceful, uncluttered environment
- Follow "less is more" philosophy
        `.trim()
    },
    {
        id: 'eclectic',
        name: 'Eclectic Boho',
        icon: '🪴',
        description: 'Mixing patterns, colors, and textures creatively',
        priceTier: 'free',
        colors: {
            primary: '#E67E22',
            secondary: '#9B59B6',
            accent: '#2ECC71',
            walls: '#FDF5E6',
            floor: '#A0522D'
        },
        furniture: {
            style: 'Bohemian Eclectic',
            pieces: ['Vintage sofa', 'Moroccan poufs', 'Macrame wall hanging', 'Floor cushions'],
            materials: ['Rattan', 'Macrame', 'Velvet', 'Wool', 'Clay']
        },
        lighting: 'Warm ambient with string lights, lanterns, and stained glass',
        decor: ['Plants everywhere', 'Patterned rugs', 'Tapestries', 'Collected objects', 'Books'],
        promptAdditions: `
- ECLECTIC BOHEMIAN STYLE:
- Mix and match patterns, textures, and colors freely
- Materials: Rattan, macrame, velvet, wool, clay, natural fibers
- Colors: Rich jewel tones, warm earth colors, eclectic combinations
- Furniture: Mix of vintage and global pieces, low seating
- Lighting: Warm ambient, string lights, lanterns, colorful glass
- Decor: Abundant plants, patterned rugs, wall hangings, collected items
- Create a lived-in, artistic, personal space
- Embrace maximalism and self-expression
        `.trim()
    },
    {
        id: 'traditional',
        name: 'Classic Traditional',
        icon: '🏛️',
        description: 'Timeless elegance, wood details, refined comfort',
        priceTier: 'premium',
        colors: {
            primary: '#8B4513',
            secondary: '#D2691E',
            accent: '#B8860B',
            walls: '#F5DEB3',
            floor: '#654321'
        },
        furniture: {
            style: 'Classic English/American',
            pieces: ['Chesterfield sofa', 'Wood coffee table', 'Wingback chairs', 'Grandfather clock'],
            materials: ['Mahogany', 'Leather', 'Damask', 'Velvet', 'Brass']
        },
        lighting: 'Warm, classic fixtures with table lamps and chandeliers',
        decor: ['Oil paintings', 'Oriental rugs', 'Antique vases', 'Books', 'Family photos'],
        promptAdditions: `
- CLASSIC TRADITIONAL STYLE:
- Timeless elegance with detailed woodwork
- Materials: Mahogany, oak, leather, damask, velvet, brass
- Colors: Warm wood tones, burgundy, navy, forest green
- Furniture: Tufted sofas, wingback chairs, substantial wood pieces
- Lighting: Warm ambient, crystal chandeliers, brass table lamps
- Decor: Oil paintings, oriental rugs, antique accessories
- Create refined, comfortable, timeless spaces
- Symmetrical arrangements and classic proportions
        `.trim()
    }
];

export const getPresetById = (id: PresetCategory): DesignPreset | undefined => {
    return DESIGN_PRESETS.find(preset => preset.id === id);
};

export const getFreePresets = (): DesignPreset[] => {
    return DESIGN_PRESETS.filter(preset => preset.priceTier === 'free');
};

export const getPremiumPresets = (): DesignPreset[] => {
    return DESIGN_PRESETS.filter(preset => preset.priceTier === 'premium');
};