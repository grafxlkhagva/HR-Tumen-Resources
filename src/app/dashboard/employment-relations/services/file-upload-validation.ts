/**
 * file-upload-validation.ts
 *
 * Client-side file validation for ER signed document uploads.
 *
 * Storage rules давхрагад мөн хяналт байгаа боловч (storage.rules:signed_docs)
 * client-side validation хэрэглэгчид богино feedback өгөхөд зориулагдсан бөгөөд
 * сүлжээ үрэхгүй (upload эхлэхээс өмнө reject хийнэ).
 *
 * Шалгалтууд:
 *  - File size <= 10MB
 *  - MIME type — pdf, jpeg, png-р хязгаарлана
 *  - "Magic bytes" (file header) — extension spoofing-оос хамгаалалт
 *  - Filename sanitize — хортой тэмдэгт, path traversal цэвэрлэнэ
 */

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = new Set([
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
]);

export class FileValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'FileValidationError';
    }
}

/**
 * Файлын эхний хэдэн байтыг уншиж magic bytes-ыг шалгана. Энэ нь extension
 * spoofing хамгаалалт — жишээлбэл `.pdf` гэж нэрлэсэн `.exe` файл.
 */
async function detectFileSignature(file: File): Promise<'pdf' | 'jpeg' | 'png' | 'unknown'> {
    const slice = file.slice(0, 8);
    const buffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // PDF: %PDF-  →  25 50 44 46 2D
    if (
        bytes[0] === 0x25 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x44 &&
        bytes[3] === 0x46 &&
        bytes[4] === 0x2d
    ) {
        return 'pdf';
    }

    // JPEG: FF D8 FF
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
        return 'jpeg';
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
        bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4e &&
        bytes[3] === 0x47 &&
        bytes[4] === 0x0d &&
        bytes[5] === 0x0a &&
        bytes[6] === 0x1a &&
        bytes[7] === 0x0a
    ) {
        return 'png';
    }

    return 'unknown';
}

/**
 * Файлын нэрийг найдвартай болгоно (path traversal, хортой тэмдэгтүүдийг арилгана).
 * Storage path-д шууд интерполяци хийгдэх тул хатуу sanitize хийнэ.
 */
export function sanitizeFilename(filename: string): string {
    // Зам тусгаарлагч, цэг, хорио тэмдэгт арилгана
    const noPath = filename.replace(/[/\\]/g, '_');
    // Зөвшөөрөгдсөн тэмдэгтүүд: latin/digit/dash/underscore/dot/space
    const cleaned = noPath.replace(/[^a-zA-Z0-9._\-\s]/g, '_');
    // Олон цэгийг нэг болгоно ("..." → "_")
    const noDoubleDot = cleaned.replace(/\.{2,}/g, '_');
    // Эхний хоосон зай, dash-ыг арилгана
    const trimmed = noDoubleDot.trim().replace(/^[._-]+/, '');
    // Урт хязгаарлалт — Storage key хязгаарлалттай нийцүүлж
    const limited = trimmed.slice(0, 120) || 'file';
    return limited;
}

export interface ValidatedFile {
    file: File;
    safeFilename: string;
    sizeBytes: number;
    detectedType: 'pdf' | 'jpeg' | 'png';
}

/**
 * Бүх шалгалтыг гүйцэтгэж нэгдсэн үр дүн буцаана.
 *
 * @throws FileValidationError
 */
export async function validateSignedDocFile(file: File): Promise<ValidatedFile> {
    // 1. Empty check
    if (!file || file.size === 0) {
        throw new FileValidationError('Файл хоосон байна');
    }

    // 2. Size check
    if (file.size > MAX_FILE_SIZE) {
        const mb = (file.size / 1024 / 1024).toFixed(1);
        throw new FileValidationError(
            `Файлын хэмжээ хэт том (${mb}MB). Зөвшөөрөгдсөн дээд хэмжээ: 10MB`,
        );
    }

    // 3. MIME type check (HTTP-аар тохируулагдсан утга)
    const mime = (file.type || '').toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(mime)) {
        throw new FileValidationError(
            `Зөвшөөрөгдөөгүй файлын төрөл: ${mime || 'тодорхойгүй'}. Зөвхөн PDF, JPEG, PNG зөвшөөрнө`,
        );
    }

    // 4. Magic byte check — extension spoofing-ээс хамгаалалт
    const detected = await detectFileSignature(file);
    if (detected === 'unknown') {
        throw new FileValidationError(
            'Файлын төрөл таних боломжгүй. Файл гэмтсэн эсвэл зөвшөөрөгдөөгүй формат байж магадгүй',
        );
    }

    // MIME type ↔ magic byte cross check
    const mimeToSig: Record<string, 'pdf' | 'jpeg' | 'png'> = {
        'application/pdf': 'pdf',
        'image/jpeg': 'jpeg',
        'image/jpg': 'jpeg',
        'image/png': 'png',
    };
    const expectedSig = mimeToSig[mime];
    if (expectedSig && expectedSig !== detected) {
        throw new FileValidationError(
            `Файлын агуулга нь зарласан төрөлтэй (${mime}) тохирохгүй байна`,
        );
    }

    // 5. Sanitize filename
    const safeFilename = sanitizeFilename(file.name);

    return {
        file,
        safeFilename,
        sizeBytes: file.size,
        detectedType: detected,
    };
}
