import { ai } from './genkit';
import { googleAI } from '@genkit-ai/google-genai';

/** Монгол Улсын иргэний үнэмлэхнээс задлагдсан мэдээлэл */
export interface ParsedNationalId {
  /** Овог (Family name / ургийн овог, жишээ: Захирагч) */
  familyName?: string;
  /** Эцэг/эхийн нэр (Surname / patronymic, жишээ: Отгонбаяр) */
  lastName?: string;
  /** Нэр (Given name, жишээ: Лхагвасүрэн) */
  firstName?: string;
  /** Хүйс: "male" | "female" */
  sex?: string;
  /** Төрсөн огноо YYYY-MM-DD */
  dateOfBirth?: string;
  /** Регистрийн дугаар (жишээ: ШГ85031318) */
  registerNumber?: string;
  /** Олгосон огноо YYYY-MM-DD */
  issueDate?: string;
  /** Хүчинтэй дуусах огноо YYYY-MM-DD */
  expiryDate?: string;
  /** Хаяг (Address) */
  address?: string;
  /** Олгосон байгууллага (Issuing authority) */
  issuingAuthority?: string;
}

const MONGOLIAN_ID_CARD_GUIDE = `
Дүрэм: Энэ даалгавар нь Монгол Улсын иргэний үнэмлэх (CITIZEN IDENTITY CARD OF MONGOLIA) зургаас бичвэр таниж, бүртгэлийн талбаруудыг JSON болгон буцаана.

НҮҮРЭН ТАЛ (урд тал):
Монгол Улсын иргэний үнэмлэхний урд талд дараах мэдээлэл байрлана:
- "Овог / Family name" → familyName (ургийн овог, жишээ: Захирагч / Zakhiragch)
- "Эцэг/эх/-ийн нэр / Surname" → lastName (эцэг/эхийн нэр, жишээ: Отгонбаяр / Otgonbayar)
- "Нэр / Given name" → firstName (өөрийн нэр, жишээ: ЛХАГВАСҮРЭН / LKHAGVASUREN)
- "Хүйс / Sex" → sex (Эрэгтэй/Male → "male", Эмэгтэй/Female → "female")
- "Төрсөн он, сар, өдөр / Date of birth" → dateOfBirth (YYYY-MM-DD)
- "Регистрийн дугаар / Registration number" → registerNumber (жишээ: ШГ85031318)

Тэмдэглэл: Монгол ба англи хоёуланг нь бичсэн байж болно. Кирилл болон латин аль ч хэлбэрийг аваарай.
Нэрийг кирилл хэлбэрээр нь авна (Лхагвасүрэн, Отгонбаяр гэх мэт). Хэрэв зөвхөн латин байвал латинаар нь авна.

АР ТАЛ (back):
- "Олгосон байгууллага / Issuing authority" → issuingAuthority (жишээ: Улсын Бүртгэлийн Ерөнхий Газар)
- "Олгосон он, сар, өдөр / Date of issue" → issueDate (YYYY-MM-DD)
- "Хүчинтэй хугацаа / Date of expiry" → expiryDate (YYYY-MM-DD)
- "Хаяг / Address" → address (бүтэн хаяг текстээр)

Заавал хүлээх дүрмүүд:
1. Зөвхөн үнэмлэх дээр харагдах үг, тоог ашиглана. Таамаглахгүй.
2. Огноог бүгдийг YYYY-MM-DD болгон буцаана (1985/03/13 → 1985-03-13).
3. Нэрийг том жижиг үсгийн зөв хэлбэрээр буцаана (ЛХАГВАСҮРЭН → Лхагвасүрэн, ОТГОНБАЯР → Отгонбаяр).
4. Регистрийн дугаарыг кирилл үсэг + тоогоор буцаана (ШГ85031318).
5. Хүйсийг зөвхөн "male" эсвэл "female" гэж буцаана.
6. Гарсан үр дүнг зөвхөн нэг JSON объектоор буцаана. Ямар ч тайлбар, markdown код блок бичихгүй.
`;

const EXTRACT_PROMPT = `
You are an expert at extracting structured data from Mongolian citizen identity cards (Монгол Улсын иргэний үнэмлэх). The document has a front side with personal info and a back side with issue/expiry dates and address.

${MONGOLIAN_ID_CARD_GUIDE}

Output schema (use these exact keys; omit if not found):
- familyName: string (ургийн овог / Family name)
- lastName: string (эцэг/эхийн нэр / Surname)
- firstName: string (нэр / Given name)
- sex: string ("male" or "female")
- dateOfBirth: string (YYYY-MM-DD only)
- registerNumber: string (кирилл + тоо, e.g. "ШГ85031318")
- issueDate: string (YYYY-MM-DD)
- expiryDate: string (YYYY-MM-DD)
- address: string (full address text)
- issuingAuthority: string (e.g. "Улсын Бүртгэлийн Ерөнхий Газар")

Return ONLY valid JSON, no markdown or explanation. Example: {"familyName":"Захирагч","lastName":"Отгонбаяр","firstName":"Лхагвасүрэн","sex":"male","dateOfBirth":"1985-03-13","registerNumber":"ШГ85031318","issueDate":"2019-02-18","expiryDate":"2030-03-13","address":"УБ, Хан-Уул, 3-р хороо, үйлдвэр гудамж, 24а байр, 510 тоот","issuingAuthority":"Улсын Бүртгэлийн Ерөнхий Газар"}
`;

function capitalizeFirstLetter(name: string): string {
  if (!name) return name;
  const lower = name.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function normalizeName(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed === trimmed.toUpperCase() && trimmed.length > 1) {
    return capitalizeFirstLetter(trimmed);
  }
  return trimmed;
}

function parseJsonResponse(raw: string): ParsedNationalId {
  let trimmed = raw.trim();
  const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) trimmed = codeBlock[1].trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  const str = jsonMatch ? jsonMatch[0] : trimmed;
  const parsed = JSON.parse(str) as Record<string, unknown>;
  const out: ParsedNationalId = {};
  if (typeof parsed.familyName === 'string' && parsed.familyName) out.familyName = normalizeName(parsed.familyName);
  if (typeof parsed.lastName === 'string' && parsed.lastName) out.lastName = normalizeName(parsed.lastName);
  if (typeof parsed.firstName === 'string' && parsed.firstName) out.firstName = normalizeName(parsed.firstName);
  if (typeof parsed.sex === 'string' && parsed.sex) {
    const s = parsed.sex.toLowerCase().trim();
    if (s === 'male' || s === 'эрэгтэй') out.sex = 'male';
    else if (s === 'female' || s === 'эмэгтэй') out.sex = 'female';
  }
  if (typeof parsed.dateOfBirth === 'string' && parsed.dateOfBirth) {
    out.dateOfBirth = parsed.dateOfBirth.trim().replace(/\//g, '-');
  }
  if (typeof parsed.registerNumber === 'string' && parsed.registerNumber) out.registerNumber = parsed.registerNumber.trim();
  if (typeof parsed.issueDate === 'string' && parsed.issueDate) out.issueDate = parsed.issueDate.trim().replace(/\//g, '-');
  if (typeof parsed.expiryDate === 'string' && parsed.expiryDate) out.expiryDate = parsed.expiryDate.trim().replace(/\//g, '-');
  if (typeof parsed.address === 'string' && parsed.address) out.address = parsed.address.trim();
  if (typeof parsed.issuingAuthority === 'string' && parsed.issuingAuthority) out.issuingAuthority = parsed.issuingAuthority.trim();
  return out;
}

async function extractFromOneImage(imageDataUrl: string, mimeType: string): Promise<ParsedNationalId> {
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

/** Хоёр зураг (урд + ар) өгвөл хоёуланг нь задлаад нэгтгэнэ */
export async function extractNationalIdFromImages(
  frontImageDataUrl: string,
  frontMimeType: string,
  backImageDataUrl?: string,
  backMimeType?: string
): Promise<ParsedNationalId> {
  const frontResult = await extractFromOneImage(frontImageDataUrl, frontMimeType);
  if (!backImageDataUrl || !backMimeType) return frontResult;

  const backResult = await extractFromOneImage(backImageDataUrl, backMimeType);
  return {
    familyName: frontResult.familyName ?? backResult.familyName,
    lastName: frontResult.lastName ?? backResult.lastName,
    firstName: frontResult.firstName ?? backResult.firstName,
    sex: frontResult.sex ?? backResult.sex,
    dateOfBirth: frontResult.dateOfBirth ?? backResult.dateOfBirth,
    registerNumber: frontResult.registerNumber ?? backResult.registerNumber,
    issueDate: backResult.issueDate ?? frontResult.issueDate,
    expiryDate: backResult.expiryDate ?? frontResult.expiryDate,
    address: backResult.address ?? frontResult.address,
    issuingAuthority: backResult.issuingAuthority ?? frontResult.issuingAuthority,
  };
}
