import { ai } from './genkit';
import { googleAI } from '@genkit-ai/google-genai';

export interface CompanyInfo {
  name?: string;
  legalName?: string;
  executiveOrderName?: string;
  registrationNumber?: string;
  taxId?: string;
  industry?: string;
  establishedDate?: string;
  ceo?: string;
  address?: string;
  phoneNumber?: string;
  contactEmail?: string;
  website?: string;
  employeeCount?: string;
}

/** Prompt for Монголын байгууллагын бүртгэлийн гэрчилгээ — fills Байгууллагын үндсэн мэдээлэл exactly. */
const MONGOLIAN_CERTIFICATE_GUIDE = `
Дүрэм: Энэ даалгавар нь Монгол Улсын байгууллагын бүртгэлийн гэрчилгээ (бизнес лиценз, Төрийн бүртгэлийн ерөнхий газрын гэрчилгээ) дээрх бичвэрээс байгууллагын үндсэн мэдээллийг яг таг олж JSON шиг буцаана.

Гэрчилгээ дээрх монгол нэр томьёо → JSON талбарууд:
- "Хуулийн этгээдийн нэр, хариуцлагын хэлбэр" гэсэн шошго доорх бүтэн текст (жишээ: "Түмэн ресурс Хязгаарлагдмал хариуцлагатай компани") — энэ хэсэгт байгууллагын нэр болон хуулийн этгээдийн нэр ИЖИЛ байдаг. Тийм бол name болон legalName хоёуланд нь ижил бүтэн утгыг оруулна. Жишээ: name: "Түмэн ресурс Хязгаарлагдмал хариуцлагатай компани", legalName: "Түмэн ресурс Хязгаарлагдмал хариуцлагатай компани".
- "Байгууллагын нэр" / "Компанийн нэр" / "Нэр" (өөр хэсэгт) → name, хэрэв legalName байхгүй бол legalName ч ижил утга.
- "Бүртгэлийн дугаар" / "Улсын бүртгэлийн дугаар" / "Регистрийн дугаар" → registrationNumber (тоог яг хэлбэрээр нь, жишээ: 1000050445)
- "Татварын дугаар" / "ТТД" / "Татварын улсын дугаар" → taxId
- "Үйл ажиллагааны чиглэл" / "Эдийн засгийн үйл ажиллагааны салбар" → industry
- "Байгуулагдсан огноо" / "Бүртгүүлсэн огноо" / "Бүртгэлийн огноо" → establishedDate (заавал YYYY-MM-DD хэлбэрт оруулна)
- "Захирал" / "Ерөнхий захирал" / "Төлөөлөгч" / "Удирдах зүйлээр томилогдсон хүн" → ceo (хүний нэр)
- "Хаяг" / "Регистрийн хаяг" / "Байршил" → address (бүтэн хаяг)
- "Утас" / "Утасны дугаар" / "Холбоо барих утас" → phoneNumber
- "И-мэйл" / "Цахим шуудан" / "Имэйл хаяг" → contactEmail
- "Вэб хуудас" / "Цахим хуудас" → website
- "Ажилтны тоо" / "Хөдөлмөрчдийн тоо" → employeeCount
- "Гүйцэтгэх захиалын нэр" → executiveOrderName. Энийг гэрчилгээний АР ТАЛААС "Нэмэлт өөрчлөлтийн агуулга" хэсгээс олж бичнэ. Хэрэв зөвхөн нүүрэн тал өгөгдсөн бол энэ талбарыг хоосон үлдээнэ.

Заавал хүлээх дүрмүүд:
1. Зөвхөн гэрчилгээ/баримт дээр харагдах үг, тоог ашиглана. Өөрийн таамаглал бичихгүй.
2. Бүртгэлийн дугаар, татварын дугаар зэргийг яг бичсэн цифрээр нь оруулна.
3. Огноо "YYYY оны MM сарын DD", "DD.MM.YYYY" гэж байвал YYYY-MM-DD болгон хөрвүүлнэ.
4. Хаяг, салбар зэргийг бүтэн бичнэ. Товчлон орчуулахгүй.
5. Гарсан үр дүнг зөвхөн нэг JSON объектоор буцаана. Ямар ч тайлбар, markdown код блок бичихгүй.
`;

const EXTRACT_PROMPT = `
You are an expert at extracting company information from Mongolian company registration certificates (Монголын байгууллагын бүртгэлийн гэрчилгээ) and similar business documents. Your output is used to auto-fill "Байгууллагын үндсэн мэдээлэл" (company basic info) fields in our system.

${MONGOLIAN_CERTIFICATE_GUIDE}

Output schema (use these exact keys; omit if not found):
- name: Company name (or full "Хуулийн этгээдийн нэр, хариуцлагын хэлбэр" block when that is the only/main name)
- legalName: Legal entity name — ИЖИЛ as name when the certificate has one block labeled "Хуулийн этгээдийн нэр, хариуцлагын хэлбэр" (e.g. "Түмэн ресурс Хязгаарлагдмал хариуцлагатай компани")
- executiveOrderName: "Гүйцэтгэх захиалын нэр" — from back side "Нэмэлт өөрчлөлтийн агуулга" only; omit if only front side given
- registrationNumber: Registration number (e.g. 1000050445) — copy digits exactly
- taxId: Tax identification number (Татварын дугаар / ТТД)
- industry: Business sector / activity (full text)
- establishedDate: YYYY-MM-DD only
- ceo: Director/CEO/Authorized person name
- address: Full registered address
- phoneNumber: Phone with digits, +, -
- contactEmail: Email
- website: URL if present
- employeeCount: Number or range if mentioned

Return ONLY valid JSON, no markdown or explanation. Example: {"name":"Түмэн ресурс Хязгаарлагдмал хариуцлагатай компани","legalName":"Түмэн ресурс Хязгаарлагдмал хариуцлагатай компани","registrationNumber":"1000050445","executiveOrderName":"ТБЕГ-ийн 2024 оны 123 дугаар захиалал","..."}
`;

function parseJsonResponse(raw: string): CompanyInfo {
  const trimmed = raw.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  const str = jsonMatch ? jsonMatch[0] : trimmed;
  const parsed = JSON.parse(str) as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(parsed)) {
    if (v == null || v === '') continue;
    out[k] = typeof v === 'string' ? v : String(v);
  }
  return out as CompanyInfo;
}

export async function extractCompanyInfoFromImage(
  imageDataUrl: string,
  mimeType: string
): Promise<CompanyInfo> {
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

export async function extractCompanyInfoFromText(inputText: string): Promise<CompanyInfo> {
  const { text } = await ai.generate({
    model: googleAI.model('gemini-2.5-flash'),
    prompt: `Text to analyze:\n${inputText}\n\n${EXTRACT_PROMPT}`,
    config: { temperature: 0.1 },
  });
  if (!text?.trim()) throw new Error('AI returned empty response');
  return parseJsonResponse(text);
}
