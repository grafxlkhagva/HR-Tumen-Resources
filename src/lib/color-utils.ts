/**
 * Converts a hex color string to HSL values (H S% L%) compatible with Tailwind CSS variables.
 * @param hex The hex color string (e.g., "#FF0000" or "#F00")
 * @returns A string in the format "H S% L%" or null if invalid
 */
export function hexToHsl(hex: string): string | null {
    let r = 0, g = 0, b = 0;
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

    if (result) {
        r = parseInt(result[1], 16);
        g = parseInt(result[2], 16);
        b = parseInt(result[3], 16);
    } else {
        const shortResult = /^#?([a-f\d])([a-f\d])([a-f\d])$/i.exec(hex);
        if (!shortResult) return null;
        r = parseInt(shortResult[1] + shortResult[1], 16);
        g = parseInt(shortResult[2] + shortResult[2], 16);
        b = parseInt(shortResult[3] + shortResult[3], 16);
    }

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
