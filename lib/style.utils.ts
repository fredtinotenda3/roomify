// FILE: C:\Users\user\Desktop\roomify\lib\style.utils.ts

import type { DesignStyle } from './types';
import { STYLE_OPTIONS } from './constants';

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

export const isValidStyle = (style: string): style is DesignStyle => {
    return STYLE_OPTIONS.some(s => s.id === style);
};

export const getAvailableStyles = (existingStyles?: Record<DesignStyle, string>): DesignStyle[] => {
    if (!existingStyles) return STYLE_OPTIONS.map(s => s.id);
    return STYLE_OPTIONS.filter(s => !existingStyles[s.id]).map(s => s.id);
};

export const getGeneratedStylesCount = (existingStyles?: Record<DesignStyle, string>): number => {
    if (!existingStyles) return 0;
    return Object.keys(existingStyles).length;
};

export const getNextRecommendedStyle = (existingStyles?: Record<DesignStyle, string>): DesignStyle | null => {
    const available = getAvailableStyles(existingStyles);
    if (available.length === 0) return null;
    
    // Return most popular styles first
    const priorityOrder: DesignStyle[] = ['modern', 'scandinavian', 'industrial', 'rustic', 'bohemian'];
    for (const style of priorityOrder) {
        if (available.includes(style)) return style;
    }
    
    return available[0];
};