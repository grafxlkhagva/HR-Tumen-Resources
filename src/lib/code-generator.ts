
export function generateCode(config: { prefix: string, digitCount: number, nextNumber: number }) {
    const { prefix, digitCount, nextNumber } = config;
    const numStr = nextNumber.toString().padStart(digitCount, '0');
    return `${prefix}${numStr}`;
}
