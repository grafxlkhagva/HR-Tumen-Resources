import { ai } from './genkit';
import { googleAI } from '@genkit-ai/google-genai';

export interface ParsedCVData {
  // Personal Info
  lastName?: string;
  firstName?: string;
  registrationNumber?: string;
  birthDate?: string;
  gender?: string;
  idCardNumber?: string;
  
  // Contact Info
  personalPhone?: string;
  personalEmail?: string;
  homeAddress?: string;
  facebook?: string;
  instagram?: string;
  
  // Education
  education?: Array<{
    country?: string;
    school?: string;
    degree?: string;
    academicRank?: string;
    entryDate?: string;
    gradDate?: string;
    diplomaNumber?: string;
  }>;
  
  // Languages
  languages?: Array<{
    language?: string;
    listening?: string;
    reading?: string;
    speaking?: string;
    writing?: string;
    testScore?: string;
  }>;
  
  // Trainings
  trainings?: Array<{
    name?: string;
    trainingType?: string;
    organization?: string;
    startDate?: string;
    endDate?: string;
    certificateNumber?: string;
  }>;
  
  // Work Experience
  experiences?: Array<{
    company?: string;
    position?: string;
    startDate?: string;
    endDate?: string;
    employmentType?: string;
    description?: string;
    isCurrent?: boolean;
  }>;
  
  // Driver's license
  hasDriversLicense?: boolean;
  driverLicenseCategories?: string[];
}

const CV_SYSTEM_PROMPT = `Та Монгол улсын HR мэргэжилтний туслах AI юм. Монгол хэл, соёл, нэр, регистрийн дугаарын форматыг сайн мэднэ.

Монгол хүний нэрний онцлог:
- Овог: Бат, Дорж, Болд, Ган, Сүх гэх мэт
- Нэр: Түвшинбаяр, Энхжаргал, Номин, Бат-Эрдэнэ гэх мэт
- Зарим нэр нь "-" тэмдэгтэй холбогдсон байдаг

Регистрийн дугаар: 
- Формат: 2 үсэг + 8 тоо (жишээ: УА88010123, ТА99050512)
- Эхний 2 үсэг нь аймаг/хотын код
- Дараагийн 2 тоо нь төрсөн он (жишээ: 88 = 1988)
- Дараагийн 2 тоо нь төрсөн сар
- Сүүлийн 4 тоо нь дугаар

ТТД (Татвар төлөгчийн дугаар): Ихэвчлэн регистрийн дугаартай адил байдаг.

Хүйс тодорхойлох: Регистрийн сүүлийн тоо тэгш бол эрэгтэй, сондгой бол эмэгтэй.

Боловсролын зэрэг:
- Бакалавр, Магистр, Доктор (PhD), Диплом, Мэргэжлийн сертификат

Хэлний түвшин:
- Анхан шат, Дунд шат, Ахисан шат, Мэргэжлийн түвшин

Ажлын төрөл:
- Үндсэн, Гэрээт, Цагийн, Хагас цагийн, Гэрээсээ`;

const CV_EXTRACT_PROMPT = `
CV/Анкет документаас дараах мэдээллийг задлан гарга. ЗӨВХӨН баримтад тодорхой харагдаж байгаа мэдээллийг л гарга.

ЧУХАЛ ДҮРМҮҮД:
1. Огноо YYYY-MM-DD форматтай байна (жишээ: 1990-05-15)
2. Хүйс "male" эсвэл "female" 
3. Хэлний түвшин: "Анхан шат", "Дунд шат", "Ахисан шат", "Мэргэжлийн түвшин"
4. Мэдээлэл олдохгүй бол тэр талбарыг бүрэн орхи
5. ЗӨВХӨН JSON буцаа, тайлбар бичих хэрэггүй

ХУВИЙН МЭДЭЭЛЭЛ:
- lastName: Овог (жишээ: "Батболд")
- firstName: Нэр (жишээ: "Энхжаргал")  
- registrationNumber: Регистрийн дугаар (формат: XX00000000, жишээ: "УА90051234")
- birthDate: Төрсөн огноо (YYYY-MM-DD)
- gender: Хүйс ("male"/"female")
- idCardNumber: ТТД эсвэл иргэний үнэмлэхний дугаар

ХОЛБОО БАРИХ:
- personalPhone: Утасны дугаар (жишээ: "99001122", "8800-1234")
- personalEmail: И-мэйл хаяг
- homeAddress: Гэрийн хаяг

БОЛОВСРОЛ (education массив):
Сургууль бүрт:
- country: Улс (жишээ: "Монгол", "БНСУ", "АНУ")
- school: Сургуулийн нэр (жишээ: "МУИС", "ШУТИС", "Отгонтэнгэр их сургууль")
- degree: Мэргэжил (жишээ: "Мэдээллийн технологи", "Санхүү", "Эдийн засаг")
- academicRank: Зэрэг (жишээ: "Бакалавр", "Магистр", "Доктор")
- entryDate: Элссэн огноо (YYYY-MM-DD эсвэл YYYY)
- gradDate: Төгссөн огноо (YYYY-MM-DD эсвэл YYYY)
- diplomaNumber: Дипломын дугаар

ГАДААД ХЭЛ (languages массив):
Хэл бүрт:
- language: Хэлний нэр (жишээ: "Англи хэл", "Орос хэл", "Хятад хэл", "Солонгос хэл", "Япон хэл")
- listening: Сонсох чадвар (жишээ: "Ахисан шат")
- reading: Унших чадвар
- speaking: Ярих чадвар  
- writing: Бичих чадвар
- testScore: Шалгалтын оноо (жишээ: "IELTS 6.5", "TOEFL 90", "TOPIK 4")

СУРГАЛТ/ГЭРЧИЛГЭЭ (trainings массив):
Сургалт бүрт:
- name: Сургалтын нэр
- trainingType: Төрөл (жишээ: "Мэргэжил дээшлүүлэх", "Сертификат", "Онлайн курс")
- organization: Зохион байгуулсан байгууллага
- startDate: Эхэлсэн огноо
- endDate: Дууссан огноо
- certificateNumber: Гэрчилгээний дугаар

АЖЛЫН ТУРШЛАГА (experiences массив):
Ажил бүрт:
- company: Байгууллагын нэр (жишээ: "Голомт банк", "МКС групп", "Монгол Телеком")
- position: Албан тушаал (жишээ: "Программист", "Менежер", "Ня-бо")
- startDate: Ажилд орсон огноо
- endDate: Гарсан огноо (одоо ажиллаж байвал хоосон орхи)
- employmentType: Ажлын төрөл ("Үндсэн", "Гэрээт", "Цагийн")
- description: Хариуцсан ажил, гүйцэтгэсэн үүрэг
- isCurrent: Одоо ажиллаж байгаа эсэх (true/false)

ЖОЛООНЫ ҮНЭМЛЭХ:
- hasDriversLicense: Жолооны үнэмлэхтэй эсэх (true/false)
- driverLicenseCategories: Ангилал (жишээ: ["B", "C"])

ЖИШЭЭ ХАРИУ:
{
  "lastName": "Батболд",
  "firstName": "Энхжаргал",
  "registrationNumber": "УА90051234",
  "birthDate": "1990-05-12",
  "gender": "female",
  "personalPhone": "99001122",
  "personalEmail": "enkhjargal@email.com",
  "education": [
    {
      "country": "Монгол",
      "school": "МУИС",
      "degree": "Мэдээллийн технологи",
      "academicRank": "Бакалавр",
      "entryDate": "2008-09-01",
      "gradDate": "2012-06-15"
    }
  ],
  "languages": [
    {
      "language": "Англи хэл",
      "listening": "Ахисан шат",
      "reading": "Ахисан шат",
      "speaking": "Дунд шат",
      "writing": "Дунд шат",
      "testScore": "IELTS 6.0"
    }
  ],
  "experiences": [
    {
      "company": "Голомт банк",
      "position": "Программист",
      "startDate": "2015-03-01",
      "employmentType": "Үндсэн",
      "description": "Банкны дотоод систем хөгжүүлэлт",
      "isCurrent": true
    }
  ],
  "hasDriversLicense": true,
  "driverLicenseCategories": ["B"]
}

ОДОО ДЭЭРХ CV ДОКУМЕНТААС МЭДЭЭЛЭЛ ЗАДЛАН JSON БУЦАА:`;

function cleanJsonResponse(raw: string): string {
  let str = raw.trim();
  
  // Remove markdown code blocks
  str = str.replace(/^```(?:json)?\s*/i, '');
  str = str.replace(/\s*```$/i, '');
  
  // Find the JSON object
  const startIdx = str.indexOf('{');
  const endIdx = str.lastIndexOf('}');
  
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    str = str.substring(startIdx, endIdx + 1);
  }
  
  return str.trim();
}

function parseJsonResponse(raw: string): ParsedCVData {
  const cleaned = cleanJsonResponse(raw);
  
  try {
    const parsed = JSON.parse(cleaned) as ParsedCVData;
    
    // Post-process and validate dates
    if (parsed.birthDate && !isValidDate(parsed.birthDate)) {
      parsed.birthDate = normalizeDate(parsed.birthDate);
    }
    
    // Normalize education dates
    if (parsed.education) {
      parsed.education = parsed.education.map(edu => ({
        ...edu,
        entryDate: edu.entryDate ? normalizeDate(edu.entryDate) : undefined,
        gradDate: edu.gradDate ? normalizeDate(edu.gradDate) : undefined,
      }));
    }
    
    // Normalize training dates
    if (parsed.trainings) {
      parsed.trainings = parsed.trainings.map(t => ({
        ...t,
        startDate: t.startDate ? normalizeDate(t.startDate) : undefined,
        endDate: t.endDate ? normalizeDate(t.endDate) : undefined,
      }));
    }
    
    // Normalize experience dates
    if (parsed.experiences) {
      parsed.experiences = parsed.experiences.map(exp => ({
        ...exp,
        startDate: exp.startDate ? normalizeDate(exp.startDate) : undefined,
        endDate: exp.endDate ? normalizeDate(exp.endDate) : undefined,
      }));
    }
    
    // Normalize phone numbers
    if (parsed.personalPhone) {
      parsed.personalPhone = normalizePhone(parsed.personalPhone);
    }
    
    return parsed;
  } catch (e) {
    console.error('Failed to parse CV JSON:', cleaned);
    console.error('Original:', raw);
    throw new Error('AI хариуг боловсруулахад алдаа гарлаа');
  }
}

function isValidDate(dateStr: string): boolean {
  const match = dateStr.match(/^\d{4}-\d{2}-\d{2}$/);
  if (!match) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

function normalizeDate(dateStr: string): string | undefined {
  if (!dateStr) return undefined;
  
  // Already in correct format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // Year only (e.g., "2015")
  if (/^\d{4}$/.test(dateStr)) {
    return `${dateStr}-01-01`;
  }
  
  // Year-month (e.g., "2015-03")
  if (/^\d{4}-\d{2}$/.test(dateStr)) {
    return `${dateStr}-01`;
  }
  
  // Try parsing various formats
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }
  
  return undefined;
}

function normalizePhone(phone: string): string {
  // Remove all non-digit characters except +
  return phone.replace(/[^\d+]/g, '');
}

export async function extractCVFromImage(
  imageDataUrl: string,
  mimeType: string
): Promise<ParsedCVData> {
  const { text } = await ai.generate({
    model: googleAI.model('gemini-2.5-flash'),
    system: CV_SYSTEM_PROMPT,
    prompt: [
      { media: { url: imageDataUrl, contentType: mimeType } },
      { text: CV_EXTRACT_PROMPT },
    ],
    config: { 
      temperature: 0.1,
      topP: 0.8,
      maxOutputTokens: 8192,
    },
  });
  
  if (!text?.trim()) throw new Error('AI хоосон хариу буцаалаа');
  return parseJsonResponse(text);
}

export async function extractCVFromText(inputText: string): Promise<ParsedCVData> {
  const { text } = await ai.generate({
    model: googleAI.model('gemini-2.5-flash'),
    system: CV_SYSTEM_PROMPT,
    prompt: `CV/Анкет текст:\n\n${inputText}\n\n${CV_EXTRACT_PROMPT}`,
    config: { 
      temperature: 0.1,
      topP: 0.8,
      maxOutputTokens: 8192,
    },
  });
  
  if (!text?.trim()) throw new Error('AI хоосон хариу буцаалаа');
  return parseJsonResponse(text);
}

export async function extractCVFromPDF(
  pdfPages: Array<{ imageDataUrl: string; mimeType: string }>
): Promise<ParsedCVData> {
  const mediaPrompts = pdfPages.map(page => ({
    media: { url: page.imageDataUrl, contentType: page.mimeType }
  }));
  
  const { text } = await ai.generate({
    model: googleAI.model('gemini-2.5-flash'),
    system: CV_SYSTEM_PROMPT,
    prompt: [
      ...mediaPrompts,
      { text: `Энэ бол олон хуудастай CV/Анкет баримт бичиг. БҮХ хуудсыг шинжилж, мэдээллийг нэгтгэж гарга.\n\n${CV_EXTRACT_PROMPT}` },
    ],
    config: { 
      temperature: 0.1,
      topP: 0.8,
      maxOutputTokens: 8192,
    },
  });
  
  if (!text?.trim()) throw new Error('AI хоосон хариу буцаалаа');
  return parseJsonResponse(text);
}
