import { ai } from './genkit';
import { googleAI } from '@genkit-ai/google-genai';

/** Монгол жолооны үнэмлэхнээс задлагдсан мэдээлэл */
export interface ParsedDriverLicense {
  /** Овог (surname / эцэг (эх)-ийн нэр) */
  lastName?: string;
  /** Нэр (given name / өөрийн нэр) */
  firstName?: string;
  /** Төрсөн огноо YYYY-MM-DD */
  dateOfBirth?: string;
  /** Үнэмлэхний дугаар (талын 5 дугаар) */
  licenseNumber?: string;
  /** Үнэмлэх олгосон огноо YYYY-MM-DD (4a) */
  licenseIssueDate?: string;
  /** Хүчинтэй дуусах огноо YYYY-MM-DD (4b эсвэл ар талын 11-р багана) */
  licenseExpiryDate?: string;
  /** Олгосон байгууллага (4c, жишээ: Цагдаагийн Ерөнхий Газар) */
  issuingAuthority?: string;
  /** Жолооны ангилал (9-р талбар, ар талын хүснэгтээс: A, B, BE, C1, C, CE, D1, D, DE, M г.м) */
  licenseClasses?: string[];
}

const MONGOLIAN_LICENSE_GUIDE = `
Дүрэм: Энэ даалгавар нь Монгол Улсын жолоодох эрхийн үнэмлэх (MONGOLIAN DRIVING LICENSE) зургаас бичвэр таниж, бүртгэлийн талбаруудыг JSON болгон буцаана.

НҮҮРЭН ТАЛ (урд тал):
- "1." — Өөрийн нэр / Given name → firstName (жишээ: ОТГОНБАЯР)
- "2." — Овог / Эцэг (эх)-ийн нэр / Surname → lastName (жишээ: ЛХАГВАСҮРЭН)
- "3." — Төрсөн огноо → dateOfBirth (заавал YYYY-MM-DD, жишээ: 1985/03/13 → 1985-03-13)
- "4a." — Олгосон огноо → licenseIssueDate (YYYY-MM-DD)
- "4b." — Хүчинтэй дуусах огноо → licenseExpiryDate (YYYY-MM-DD)
- "4c." — Үнэмлэх олгосон байгууллага (Цагдаагийн Ерөнхий Газар г.м) → issuingAuthority
- "5." — Үнэмлэхийн дугаар → licenseNumber (тоо, жишээ: 484130)
- "9." — Тээврийн хэрэгслийн ангилал (нэг эсвэл хэд хэдэн: A, B, C, D, M г.м) → licenseClasses массив

АР ТАЛ (back):
- "MONGOLIAN DRIVING LICENSE" гэсэн толгойтой хүснэгт: 9-р багана — ангилал (A, B, BE, C1, C1E, C, CE, D1, D1E, D, DE, M), 10 — олгосон огноо, 11 — дуусах огноо.
- Хүснэгтэнд огноо бөглөгдсөн ангиллуудыг licenseClasses массивт оруулна (жишээ: ["B"] эсвэл ["A","B","C"]).
- Хүчинтэй дуусах огноо нь ихэвчлэн ар талын 11-р багана эсвэл нүүрэн талын 4b-аас олно.
- Доод хэсэгт "Number: 484130" гэх мэт үнэмлэхийн дугаар давтагдаж болно.

Заавал хүлээх дүрмүүд:
1. Зөвхөн үнэмлэх дээр харагдах үг, тоог ашиглана.
2. Огноог бүгдийг YYYY-MM-DD болгон буцаана (1985/03/13 → 1985-03-13).
3. licenseClasses нь латин үсгээр: A, B, BE, C1, C1E, C, CE, D1, D1E, D, DE, M гэх мэт.
4. Гарсан үр дүнг зөвхөн нэг JSON объектоор буцаана. Ямар ч тайлбар, markdown код блок бичихгүй.
`;

const EXTRACT_PROMPT = `
You are an expert at extracting structured data from Mongolian driving license documents (Монгол улсын жолоодох эрхийн үнэмлэх). The document has a front side with personal and license info, and a back side with a table of vehicle categories and validity dates.

${MONGOLIAN_LICENSE_GUIDE}

Output schema (use these exact keys; omit if not found):
- lastName: string (овог / surname)
- firstName: string (нэр / given name)
- dateOfBirth: string (YYYY-MM-DD only)
- licenseNumber: string (digits only, e.g. "484130")
- licenseIssueDate: string (YYYY-MM-DD)
- licenseExpiryDate: string (YYYY-MM-DD)
- issuingAuthority: string (e.g. "Цагдаагийн Ерөнхий Газар")
- licenseClasses: string[] (e.g. ["B"] or ["A","B","C"] — use letters from the document)

Return ONLY valid JSON, no markdown or explanation. Example: {"lastName":"ЛХАГВАСҮРЭН","firstName":"ОТГОНБАЯР","dateOfBirth":"1985-03-13","licenseNumber":"484130","licenseExpiryDate":"2026-03-14","licenseClasses":["B"]}
`;

function parseJsonResponse(raw: string): ParsedDriverLicense {
  let trimmed = raw.trim();
  const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) trimmed = codeBlock[1].trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  const str = jsonMatch ? jsonMatch[0] : trimmed;
  const parsed = JSON.parse(str) as Record<string, unknown>;
  const out: ParsedDriverLicense = {};
  if (typeof parsed.lastName === 'string' && parsed.lastName) out.lastName = parsed.lastName.trim();
  if (typeof parsed.firstName === 'string' && parsed.firstName) out.firstName = parsed.firstName.trim();
  if (typeof parsed.dateOfBirth === 'string' && parsed.dateOfBirth) out.dateOfBirth = parsed.dateOfBirth.trim();
  if (typeof parsed.licenseNumber === 'string' && parsed.licenseNumber) out.licenseNumber = parsed.licenseNumber.trim();
  if (typeof parsed.licenseIssueDate === 'string' && parsed.licenseIssueDate) out.licenseIssueDate = parsed.licenseIssueDate.trim();
  if (typeof parsed.licenseExpiryDate === 'string' && parsed.licenseExpiryDate) out.licenseExpiryDate = parsed.licenseExpiryDate.trim();
  if (typeof parsed.issuingAuthority === 'string' && parsed.issuingAuthority) out.issuingAuthority = parsed.issuingAuthority.trim();
  if (Array.isArray(parsed.licenseClasses)) {
    out.licenseClasses = parsed.licenseClasses
      .filter((c): c is string => typeof c === 'string' && c.length > 0)
      .map((c) => c.trim().toUpperCase());
  }
  return out;
}

/** Нэг зургаас үнэмлэхний мэдээлэл задлах */
async function extractFromOneImage(imageDataUrl: string, mimeType: string): Promise<ParsedDriverLicense> {
  const { text } = await ai.generate({
    model: googleAI.model('gemini-2.5-flash'),
    prompt: [
      { media: { url: imageDataUrl, contentType: mimeType } },
      { text: EXTRACT_PROMPT },
    ],
    config: { temperature: 0.1 },
  });
  if (!text?.trim()) throw new Error('AI returned empty response');
  return parseJsonResponse(text);
}

/** Хоёр зураг (урд + ар) өгвөл хоёуланг нь задлаад нэгтгэнэ (ар талаас ангилал, огноо нэмж болно) */
export async function extractDriverLicenseFromImages(
  frontImageDataUrl: string,
  frontMimeType: string,
  backImageDataUrl?: string,
  backMimeType?: string
): Promise<ParsedDriverLicense> {
  const frontResult = await extractFromOneImage(frontImageDataUrl, frontMimeType);
  if (!backImageDataUrl || !backMimeType) return frontResult;

  const backResult = await extractFromOneImage(backImageDataUrl, backMimeType);
  return {
    lastName: frontResult.lastName ?? backResult.lastName,
    firstName: frontResult.firstName ?? backResult.firstName,
    dateOfBirth: frontResult.dateOfBirth ?? backResult.dateOfBirth,
    licenseNumber: frontResult.licenseNumber ?? backResult.licenseNumber,
    licenseIssueDate: frontResult.licenseIssueDate ?? backResult.licenseIssueDate,
    licenseExpiryDate: frontResult.licenseExpiryDate ?? backResult.licenseExpiryDate,
    issuingAuthority: frontResult.issuingAuthority ?? backResult.issuingAuthority,
    licenseClasses:
      (backResult.licenseClasses?.length ? backResult.licenseClasses : frontResult.licenseClasses) ??
      frontResult.licenseClasses,
  };
}
