/**
 * Parses a hex color string to RGB values.
 * @param hex The hex color string (e.g., "#FF0000" or "#F00")
 * @returns An object with r, g, b values (0-255) or null if invalid
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
        return {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
        };
    }
    const shortResult = /^#?([a-f\d])([a-f\d])([a-f\d])$/i.exec(hex);
    if (shortResult) {
        return {
            r: parseInt(shortResult[1] + shortResult[1], 16),
            g: parseInt(shortResult[2] + shortResult[2], 16),
            b: parseInt(shortResult[3] + shortResult[3], 16),
        };
    }
    return null;
}

/**
 * Calculates the relative luminance of a color according to WCAG 2.1.
 * @param hex The hex color string
 * @returns The relative luminance (0-1) or 0 if invalid
 */
export function getLuminance(hex: string): number {
    const rgb = hexToRgb(hex);
    if (!rgb) return 0;

    const { r, g, b } = rgb;
    const [rs, gs, bs] = [r, g, b].map((c) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculates the contrast ratio between two colors according to WCAG 2.1.
 * @param color1 First hex color
 * @param color2 Second hex color
 * @returns The contrast ratio (1-21)
 */
export function getContrastRatio(color1: string, color2: string): number {
    const l1 = getLuminance(color1);
    const l2 = getLuminance(color2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Checks if a color combination meets WCAG accessibility standards.
 * @param foreground Foreground (text) color
 * @param background Background color
 * @returns Object with AA and AAA compliance for normal and large text
 */
export function checkWcagCompliance(foreground: string, background: string): {
    ratio: number;
    aa: { normalText: boolean; largeText: boolean };
    aaa: { normalText: boolean; largeText: boolean };
} {
    const ratio = getContrastRatio(foreground, background);
    return {
        ratio: Math.round(ratio * 100) / 100,
        aa: {
            normalText: ratio >= 4.5,
            largeText: ratio >= 3,
        },
        aaa: {
            normalText: ratio >= 7,
            largeText: ratio >= 4.5,
        },
    };
}

/**
 * Determines if text should be white or black based on background color for readability.
 * @param hex The background hex color
 * @returns '#ffffff' for dark backgrounds, '#000000' for light backgrounds
 */
export function getContrastTextColor(hex: string): string {
    const luminance = getLuminance(hex);
    return luminance > 0.179 ? '#000000' : '#ffffff';
}

/**
 * Converts a hex color string to HSL values (H S% L%) compatible with Tailwind CSS variables.
 * @param hex The hex color string (e.g., "#FF0000" or "#F00")
 * @returns A string in the format "H S% L%" or null if invalid
 */
export function hexToHsl(hex: string): string | null {
    const rgb = hexToRgb(hex);
    if (!rgb) return null;

    let { r, g, b } = rgb;
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    h = Math.round(h * 360);
    s = Math.round(s * 100);
    l = Math.round(l * 100);

    return `${h} ${s}% ${l}%`;
}

/**
 * Lightens a hex color by a percentage.
 * @param hex The hex color string
 * @param percent The percentage to lighten (0-100)
 * @returns The lightened hex color
 */
export function lightenColor(hex: string, percent: number): string {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;

    const { r, g, b } = rgb;
    const amount = Math.round(2.55 * percent);
    const newR = Math.min(255, r + amount);
    const newG = Math.min(255, g + amount);
    const newB = Math.min(255, b + amount);

    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

/**
 * Darkens a hex color by a percentage.
 * @param hex The hex color string
 * @param percent The percentage to darken (0-100)
 * @returns The darkened hex color
 */
export function darkenColor(hex: string, percent: number): string {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;

    const { r, g, b } = rgb;
    const amount = Math.round(2.55 * percent);
    const newR = Math.max(0, r - amount);
    const newG = Math.max(0, g - amount);
    const newB = Math.max(0, b - amount);

    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}
