/**
 * Албан бичгийг browser-ын native print dialog-оор "Save as PDF" болгох.
 *
 * Өмнө нь html2canvas + jsPDF-ээр bitmap PDF гаргадаг байсныг орлуулсан:
 * - Vector output (текст сонгогдоно)
 * - Mongolian Cyrillic фонт хэрэглэгчийн OS-оос ирдэг тул embed шаардлагагүй
 * - CORS асуудал байхгүй (browser өөрөө DOM-ийг ашиглана)
 * - Bundle-ээс 400KB+ хөнгөрнө
 */
import type { OfficialLetterConfig } from '../types';

type PaperSize = OfficialLetterConfig['paperSize'];
type Orientation = OfficialLetterConfig['orientation'];

/** @page тохиргоог runtime-д inject хийх — A5/landscape дэмжихэд зориулсан. */
function injectPrintStyle(paperSize: PaperSize, orientation: Orientation): () => void {
    const id = 'ob-print-page-style';
    document.getElementById(id)?.remove();
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `@page { size: ${paperSize} ${orientation}; margin: 0; }`;
    document.head.appendChild(style);
    return () => {
        document.getElementById(id)?.remove();
    };
}

export interface PrintLetterOptions {
    /** Print dialog нээхээс өмнө ямар ч DOM өөрчлөлт тогтворжтол хүлээх миллисек. */
    settleMs?: number;
}

/**
 * Paper-ийг browser-ын print dialog-т гаргана. Хэрэглэгч "Save as PDF"-ээр татна.
 * Promise нь print-ийн afterprint эсвэл timeout дээр resolve болно.
 */
export async function printLetter(
    paperRoot: HTMLElement | null,
    config: Pick<OfficialLetterConfig, 'paperSize' | 'orientation'>,
    options: PrintLetterOptions = {},
): Promise<void> {
    if (!paperRoot) throw new Error('Paper element олдсонгүй');
    const { settleMs = 80 } = options;

    const cleanupStyle = injectPrintStyle(config.paperSize, config.orientation);
    paperRoot.classList.add('ob-printing');

    const restore = () => {
        paperRoot.classList.remove('ob-printing');
        cleanupStyle();
        window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);

    try {
        // rAF × 2 — layout (pagination re-measure, CSS class changes) тогтворжтол хүлээх
        await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
        if (settleMs > 0) await new Promise(r => setTimeout(r, settleMs));
        window.print();
    } finally {
        // afterprint event зарим browser-д гүйцэтгэгдэхгүй (Safari) — timeout fallback
        setTimeout(restore, 800);
    }
}
