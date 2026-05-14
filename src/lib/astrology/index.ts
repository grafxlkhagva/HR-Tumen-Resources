export { getWesternSign, type WesternSign } from './western-zodiac';
export { getChineseSign, type ChineseSign } from './chinese-zodiac';
export { calculateLifePath, getLifePathCalculation, type LifePathInfo } from './numerology';

import { getWesternSign } from './western-zodiac';
import { getChineseSign } from './chinese-zodiac';
import { calculateLifePath, getLifePathCalculation } from './numerology';

export interface AstrologyProfile {
    western: ReturnType<typeof getWesternSign>;
    chinese: ReturnType<typeof getChineseSign>;
    lifePath: ReturnType<typeof calculateLifePath>;
    lifePathCalc: string;
}

export function buildAstrologyProfile(birthDate: string | Date): AstrologyProfile | null {
    try {
        const d = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
        if (isNaN(d.getTime())) return null;
        const year = d.getFullYear();
        const month = d.getMonth() + 1;
        const day = d.getDate();

        return {
            western: getWesternSign(month, day),
            chinese: getChineseSign(year, month, day),
            lifePath: calculateLifePath(year, month, day),
            lifePathCalc: getLifePathCalculation(year, month, day),
        };
    } catch {
        return null;
    }
}
