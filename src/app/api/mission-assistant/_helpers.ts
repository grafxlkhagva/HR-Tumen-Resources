/**
 * Gemini зарим үед ```json ... ``` хэлбэрээр буцаадаг тул хуулдсыг тайрна.
 */
export function parseAiJson<T = any>(raw: string | undefined): T | null {
    if (!raw) return null;
    let text = raw.trim();
    // Strip ```json ... ``` or ``` ... ``` fences
    if (text.startsWith('```')) {
        text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    }
    // Sometimes wraps full response in plain text — try to find first { ... last }
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
        text = text.slice(firstBrace, lastBrace + 1);
    }
    try {
        return JSON.parse(text) as T;
    } catch {
        return null;
    }
}
