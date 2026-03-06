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
  
  // Family / Marital
  maritalStatus?: string;
  
  // Education
  education?: Array<{
    country?: string;
    school?: string;
    degree?: string;
    academicRank?: string;
    entryDate?: string;
    gradDate?: string;
    diplomaNumber?: string;
    isCurrent?: boolean;
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

const CV_SYSTEM_PROMPT = `Та Монгол улсын HR системийн CV/Анкет задлагч AI юм. Монгол хэл, нэр, регистрийн дугаарын формат, Монголын боловсролын систем, ажлын зах зээлийг маш сайн мэднэ.

=== МОНГОЛЫН НИЙТЛЭГ CV ЗАГВАРЫН БҮТЭЦ ===
Монголд хамгийн түгээмэл CV загвар нь дараах бүтэцтэй байдаг:

1. ТОЛГОЙ ХЭСЭГ:
   - Овог Нэр (жишээ: "Билэгсайхан Баярцэцэг")
   - Мэргэжлийн чиглэл (жишээ: "Хүний нөөцийн менежмент")  
   - Утасны дугаар (жишээ: "88054099")
   - И-мэйл (жишээ: "lt.tseegii@gmail.com")
   - Хаяг (жишээ: "Баянзүрх дүүрэг")
   - Англи нэр (жишээ: "bilegsaikhan bayartsetseg")
   - Зорилго/Товч танилцуулга

2. ЕРӨНХИЙ МЭДЭЭЛЭЛ:
   - "Төрсөн огноо: YYYY-MM-DD" формат
   - "Хүйс: Эрэгтэй/Эмэгтэй"
   - "Гэрлэлтийн байдал: Гэрлэсэн/Гэрлээгүй/Салсан/Бэлэвсэн"
   - "Регистрийн дугаар: XX00000000"
   - "Жолооны үнэмлэх: B" эсвэл "Жолооны үнэмлэх: B, C"

3. АЖЛЫН ТУРШЛАГА:
   Компани бүрт:
   - Компанийн нэр (жишээ: "Жүр Үр ХХК")
   - "• Албан тушаал ХУГАЦАА / YYYY-MM-DD - YYYY-MM-DD"
   - Хэрэв зүүн тийш "-" тэмдэгтэй дуусвал одоо ажиллаж байна гэсэн үг
   - Жишээ: "2017-06-01 -" = одоо ажиллаж байна (isCurrent: true)

4. БОЛОВСРОЛ:
   Сургууль бүрт:
   - Сургуулийн бүтэн нэр (жишээ: "Шинжлэх Ухаан Технологийн Их Сургууль")
   - "YYYY - YYYY" огноо
   - "Зэрэг | Мэргэжил | Голч | Улс"
   - Жишээ: "Магистр | Хүний нөөцийн менежмент | 3.6 голч | Монгол"

5. СУРГАЛТ, СЕРТИФИКАТ:
   Сургалт бүрт:
   - Сургалтын нэр
   - "YYYY - YYYY" огноо
   - Зохион байгуулсан байгууллага

6. УР ЧАДВАР:
   - Хувийн ур чадвар
   - Компьютерын мэдлэг
   - Мэргэжлийн ур чадвар

=== МОНГОЛ ХҮНИЙ НЭРНИЙ ДҮРЭМ ===
- CV-ийн хамгийн дээд хэсэгт "Овог Нэр" форматаар бичигддэг
- Эхний үг нь ОВОГ, хоёр дахь үг нь НЭР
- Жишээ: "Билэгсайхан Баярцэцэг" → овог: "Билэгсайхан", нэр: "Баярцэцэг"
- Жишээ: "Батболд Тэмүүлэн" → овог: "Батболд", нэр: "Тэмүүлэн"
- Зарим нэр нь "-" тэмдэгтэй (жишээ: "Бат-Эрдэнэ")
- АНГЛИ нэрээр бас тодорхойлж болно: "bilegsaikhan bayartsetseg" → овог: Билэгсайхан

=== РЕГИСТРИЙН ДУГААР ===
- Формат: 2 кирилл үсэг + 8 тоо (жишээ: ШГ85030868, УА88010123, ТА99050512)
- Эхний 2 үсэг: аймаг/хотын код
- Дараагийн 2 тоо: төрсөн оны сүүлийн 2 оронтой тоо (85 = 1985)
- Дараагийн 2 тоо: төрсөн сар (03 = 3-р сар)
- Сүүлийн 4 тоо: дугаар
- Регистрийн СҮҮЛИЙН ТОО тэгш бол → ЭМЭГТЭЙ, сондгой бол → ЭРЭГТЭЙ
- ТТД (Татвар төлөгчийн дугаар) нь регистрийн дугаартай ижил байдаг

=== МОНГОЛЫН ИХ ДЭЭД СУРГУУЛИУДЫН НЭР ===
CV-д бүтэн нэрээр бичигдсэн сургуулиудын товчлол:
- "Шинжлэх Ухаан Технологийн Их Сургууль" → "Шинжлэх Ухаан Технологийн Их Сургууль"
- "Монгол Улсын Их Сургууль" → "Монгол Улсын Их Сургууль"
- "Хөдөө Аж Ахуйн Их Сургууль" → "Хөдөө Аж Ахуйн Их Сургууль"
- "Монгол Улсын Боловсролын Их Сургууль" → "Монгол Улсын Боловсролын Их Сургууль"
- Товчлол хэрэглэхгүй, CV-д яг бичигдсэн нэрийг ашигла
- "Нийслэлийн Ерөнхий Боловсролын 34-р Сургууль" гэх мэт бага дунд сургууль бас байж болно

=== ХЭЛНИЙ ТҮВШИН ===
Манай системд хэлний түвшинг ЗААВАЛ дараах 4 утгын аль нэгээр бичнэ:
- "Анхан" (beginner)
- "Дунд" (intermediate)
- "Ахисан" (advanced)
- "Мэргэжлийн" (professional/native)
АНХААРУУЛГА: "Анхан шат", "Дунд шат" гэж БИЧИХГҮЙ. Зөвхөн "Анхан", "Дунд", "Ахисан", "Мэргэжлийн" гэж бичнэ.

=== ГЭРЛЭЛТИЙН БАЙДАЛ ===
Манай системд ЗААВАЛ дараах 4 утгын аль нэгээр бичнэ:
- "Гэрлээгүй"
- "Гэрлэсэн"
- "Салсан"
- "Бэлэвсэн"`;

const CV_EXTRACT_PROMPT = `
CV/Анкет документаас дараах БҮХИЙ Л мэдээллийг нарийвчлан задлан гарга. ЗӨВХӨН баримтад тодорхой харагдаж байгаа мэдээллийг л гарга.

=== ЧУХАЛ ДҮРМҮҮД ===
1. Огноо YYYY-MM-DD форматтай байна (жишээ: 1990-05-15). Хэрэв зөвхөн жил байвал YYYY-01-01.
2. Хүйс "male" эсвэл "female". Регистрийн сүүлийн тоо тэгш → "female", сондгой → "male".
3. Хэлний түвшин ЗААВАЛ: "Анхан", "Дунд", "Ахисан", "Мэргэжлийн" гэсэн 4 утгын аль нэг байна. "шат", "түвшин" гэж НЭМЭХГҮЙ!
4. Гэрлэлтийн байдал ЗААВАЛ: "Гэрлээгүй", "Гэрлэсэн", "Салсан", "Бэлэвсэн" гэсэн 4 утгын аль нэг.
5. Мэдээлэл олдохгүй бол тэр талбарыг JSON-д бүрэн оруулахгүй (null, "", бичихгүй).
6. ЗӨВХӨН JSON буцаа, тайлбар бичих хэрэггүй.
7. CV-ийн хамгийн дээр байгаа нэрний ЭХНИЙ ҮГ нь ОВОГ, ХОЁР ДАХЬ ҮГ нь НЭР.

=== ЗАДЛАХ ТАЛБАРУУД ===

ХУВИЙН МЭДЭЭЛЭЛ:
- lastName: Овог (CV-ийн толгой хэсгийн эхний үг)
- firstName: Нэр (CV-ийн толгой хэсгийн хоёр дахь үг)
- registrationNumber: Регистрийн дугаар (XX00000000 формат, кирилл 2 үсэг + 8 тоо)
- birthDate: Төрсөн огноо (YYYY-MM-DD). Регистрээс тодорхойлж болно: XX850308xx → 1985-03-08
- gender: "male" эсвэл "female". CV-д "Эрэгтэй" → "male", "Эмэгтэй" → "female". Эсвэл регистрийн сүүлийн тоо тэгш → "female", сондгой → "male"
- idCardNumber: ТТД (Татвар төлөгчийн дугаар). Ихэвчлэн регистрийн дугаартай ижил

ХОЛБОО БАРИХ:
- personalPhone: Утасны дугаар (зөвхөн цифрүүд, жишээ: "88054099")
- personalEmail: И-мэйл хаяг
- homeAddress: Хаяг (дүүрэг, хороо гэх мэт)

ГЭРЛЭЛТИЙН БАЙДАЛ:
- maritalStatus: "Гэрлээгүй" | "Гэрлэсэн" | "Салсан" | "Бэлэвсэн"

БОЛОВСРОЛ (education массив) - Сургууль бүрт:
- country: Улс (Монгол дотоодын сургууль бол "Монгол")
- school: Сургуулийн нэр (CV-д яг бичигдсэн нэр, жишээ: "Шинжлэх Ухаан Технологийн Их Сургууль")
- degree: Мэргэжил (жишээ: "Хүний нөөцийн менежмент", "Инженер эдийн засаг")
- academicRank: Зэрэг ("Бакалавр", "Магистр", "Доктор", "Тусгай дунд")
- entryDate: Элссэн огноо (YYYY-01-01)
- gradDate: Төгссөн огноо (YYYY-01-01)
- isCurrent: Одоо сурч байгаа эсэх (boolean)
- diplomaNumber: Дипломын дугаар (хэрэв байвал)

ЧУХАЛ: Ерөнхий боловсролын сургууль (бага, дунд сургууль) бас БОЛОВСРОЛД оруулна!
  - academicRank: "Тусгай дунд" эсвэл "Ерөнхий боловсрол"
  - degree: "Ерөнхий боловсрол"

ГАДААД ХЭЛ (languages массив) - Хэл бүрт:
- language: Хэлний нэр ("Англи хэл", "Орос хэл", "Хятад хэл", "Солонгос хэл", "Япон хэл")
- listening: Сонсох чадвар ("Анхан" | "Дунд" | "Ахисан" | "Мэргэжлийн")
- reading: Унших чадвар ("Анхан" | "Дунд" | "Ахисан" | "Мэргэжлийн")
- speaking: Ярих чадвар ("Анхан" | "Дунд" | "Ахисан" | "Мэргэжлийн")
- writing: Бичих чадвар ("Анхан" | "Дунд" | "Ахисан" | "Мэргэжлийн")
- testScore: Шалгалтын оноо (жишээ: "IELTS 6.5", "TOEFL 90", "TOPIK 4")

АНХААР: CV-д хэлний мэдлэг тусад нь бичигдээгүй ч "Ур чадвар" хэсэгт компьютерын мэдлэгтэй хамт байж болно. Хэлний мэдлэг олдохгүй бол languages массив бүрэн орхи.

СУРГАЛТ/ГЭРЧИЛГЭЭ (trainings массив) - Сургалт бүрт:
- name: Сургалтын нэр (жишээ: "Хүний нөөцийн практик дадлага олгох сургалт")
- organization: Зохион байгуулсан байгууллага (жишээ: "Хүний нөөцийн удирдлага шинэчлэлийн академи")
- startDate: Эхэлсэн огноо (YYYY-01-01)
- endDate: Дууссан огноо (YYYY-01-01)
- certificateNumber: Гэрчилгээний дугаар (хэрэв байвал)

АЖЛЫН ТУРШЛАГА (experiences массив) - ХАМГИЙН ЧУХАЛ ХЭСЭГ! Ажил бүрт:
- company: Компанийн нэр (ХХК, ТББ гэх мэт хуулийн хэлбэрийг хадгална. Жишээ: "Жүр Үр ХХК")
- position: Албан тушаал (жишээ: "Хүний хөгжлийн хэлтсийн захирал")
- startDate: Ажилд орсон огноо (YYYY-MM-DD)
- endDate: Гарсан огноо (YYYY-MM-DD). ЧУХАЛ: Хэрэв огноо "-" тэмдэгтэй дуусвал эсвэл endDate байхгүй бол ХООСОН ОРХИ - энэ нь одоо ажиллаж байна гэсэн үг
- isCurrent: Одоо ажиллаж байгаа эсэх. endDate байхгүй эсвэл "-" тэмдэгтэй дуусвал true. Жишээ: "2017-06-01 -" → isCurrent: true
- description: Ажлын тодорхойлолт (хэрэв байвал)

ЧУХАЛ: Ажлын туршлагыг CV-д бичигдсэн ДАРААЛЛААР нь оруулна (хамгийн сүүлийн ажил эхэнд).

ЖОЛООНЫ ҮНЭМЛЭХ:
- hasDriversLicense: Жолооны үнэмлэхтэй эсэх (true/false)
- driverLicenseCategories: Ангилал массив (жишээ: ["B"], ["B", "C"])

=== ЖИШЭЭ: БОДИТ CV ЗАДЛАЛТ ===

Оролт:
"Билэгсайхан Баярцэцэг
Хүний нөөцийн менежмент
88054099
lt.tseegii@gmail.com
Баянзүрх дүүрэг
...
Төрсөн огноо: 1985-03-08 Хүйс: Эмэгтэй Гэрлэлтийн байдал: Гэрлэсэн
Регистрийн дугаар: ШГ85030868 Жолооны үнэмлэх: B
...
Жүр Үр ХХК
• Хүний хөгжлийн хэлтсийн захирал 2017-06-01 -
Таван богд Менежмент ХХК
• Хүний нөөцийн мэргэжилтэн 5 сар / 2016-08-01 - 2017-01-01
...
Шинжлэх Ухаан Технологийн Их Сургууль 2012 - 2015
Магистр | Хүний нөөцийн менежмент | 3.6 голч | Монгол"

Гаралт:
{
  "lastName": "Билэгсайхан",
  "firstName": "Баярцэцэг",
  "registrationNumber": "ШГ85030868",
  "birthDate": "1985-03-08",
  "gender": "female",
  "idCardNumber": "ШГ85030868",
  "personalPhone": "88054099",
  "personalEmail": "lt.tseegii@gmail.com",
  "homeAddress": "Баянзүрх дүүрэг",
  "maritalStatus": "Гэрлэсэн",
  "education": [
    {
      "country": "Монгол",
      "school": "Шинжлэх Ухаан Технологийн Их Сургууль",
      "degree": "Хүний нөөцийн менежмент",
      "academicRank": "Магистр",
      "entryDate": "2012-01-01",
      "gradDate": "2015-01-01",
      "isCurrent": false
    }
  ],
  "experiences": [
    {
      "company": "Жүр Үр ХХК",
      "position": "Хүний хөгжлийн хэлтсийн захирал",
      "startDate": "2017-06-01",
      "isCurrent": true
    },
    {
      "company": "Таван богд Менежмент ХХК",
      "position": "Хүний нөөцийн мэргэжилтэн",
      "startDate": "2016-08-01",
      "endDate": "2017-01-01",
      "isCurrent": false
    }
  ],
  "hasDriversLicense": true,
  "driverLicenseCategories": ["B"]
}

=== ОДОО ДЭЭРХ CV ДОКУМЕНТААС МЭДЭЭЛЭЛ ЗАДЛАН JSON БУЦАА ===`;

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

// Normalize language proficiency level to match form values exactly
function normalizeProficiency(level: string | undefined): string | undefined {
  if (!level) return undefined;
  const normalized = level.trim();
  
  // Map common variations to exact system values
  const map: Record<string, string> = {
    'анхан шат': 'Анхан',
    'анхан': 'Анхан',
    'дунд шат': 'Дунд',
    'дунд': 'Дунд',
    'ахисан шат': 'Ахисан',
    'ахисан': 'Ахисан',
    'мэргэжлийн түвшин': 'Мэргэжлийн',
    'мэргэжлийн': 'Мэргэжлийн',
    'beginner': 'Анхан',
    'elementary': 'Анхан',
    'intermediate': 'Дунд',
    'upper intermediate': 'Ахисан',
    'advanced': 'Ахисан',
    'proficient': 'Мэргэжлийн',
    'professional': 'Мэргэжлийн',
    'native': 'Мэргэжлийн',
    'fluent': 'Мэргэжлийн',
  };
  
  const key = normalized.toLowerCase();
  return map[key] || normalized;
}

// Normalize marital status to match exact form enum values
function normalizeMaritalStatus(status: string | undefined): string | undefined {
  if (!status) return undefined;
  const normalized = status.trim();
  
  const map: Record<string, string> = {
    'гэрлээгүй': 'Гэрлээгүй',
    'гэрлэсэн': 'Гэрлэсэн',
    'салсан': 'Салсан',
    'бэлэвсэн': 'Бэлэвсэн',
    'single': 'Гэрлээгүй',
    'married': 'Гэрлэсэн',
    'divorced': 'Салсан',
    'widowed': 'Бэлэвсэн',
  };
  
  const key = normalized.toLowerCase();
  const result = map[key];
  
  // Only return valid values that match the schema enum
  const validValues = ['Гэрлээгүй', 'Гэрлэсэн', 'Салсан', 'Бэлэвсэн'];
  if (result && validValues.includes(result)) return result;
  if (validValues.includes(normalized)) return normalized;
  
  return undefined;
}

function parseJsonResponse(raw: string): ParsedCVData {
  const cleaned = cleanJsonResponse(raw);
  
  try {
    const parsed = JSON.parse(cleaned) as ParsedCVData;
    
    // Post-process and validate dates
    if (parsed.birthDate && !isValidDate(parsed.birthDate)) {
      parsed.birthDate = normalizeDate(parsed.birthDate);
    }
    
    // Normalize marital status
    if (parsed.maritalStatus) {
      parsed.maritalStatus = normalizeMaritalStatus(parsed.maritalStatus);
    }
    
    // Normalize education dates and fields
    if (parsed.education) {
      parsed.education = parsed.education.map(edu => ({
        ...edu,
        entryDate: edu.entryDate ? normalizeDate(edu.entryDate) : undefined,
        gradDate: edu.gradDate ? normalizeDate(edu.gradDate) : undefined,
        country: edu.country || 'Монгол', // Default to Mongolia if not specified
      }));
    }
    
    // Normalize language proficiency levels
    if (parsed.languages) {
      parsed.languages = parsed.languages.map(lang => ({
        ...lang,
        listening: normalizeProficiency(lang.listening),
        reading: normalizeProficiency(lang.reading),
        speaking: normalizeProficiency(lang.speaking),
        writing: normalizeProficiency(lang.writing),
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
    
    // Normalize experience dates and isCurrent
    if (parsed.experiences) {
      parsed.experiences = parsed.experiences.map(exp => ({
        ...exp,
        startDate: exp.startDate ? normalizeDate(exp.startDate) : undefined,
        endDate: exp.endDate ? normalizeDate(exp.endDate) : undefined,
        // If no endDate and isCurrent is not explicitly false, assume currently working
        isCurrent: exp.isCurrent === true || (!exp.endDate && exp.isCurrent !== false),
      }));
    }
    
    // Normalize phone numbers
    if (parsed.personalPhone) {
      parsed.personalPhone = normalizePhone(parsed.personalPhone);
    }
    
    // If gender not detected, try to infer from registration number
    if (!parsed.gender && parsed.registrationNumber) {
      const regNum = parsed.registrationNumber.replace(/[^0-9]/g, '');
      if (regNum.length >= 1) {
        const lastDigit = parseInt(regNum[regNum.length - 1], 10);
        parsed.gender = lastDigit % 2 === 0 ? 'female' : 'male';
      }
    }
    
    // If birthDate not detected, try to infer from registration number
    if (!parsed.birthDate && parsed.registrationNumber) {
      const match = parsed.registrationNumber.match(/[А-Яа-яЁёҮүӨө]{2}(\d{2})(\d{2})(\d{2})\d{2}/);
      if (match) {
        const year = parseInt(match[1], 10);
        const month = match[2];
        const day = match[3];
        const fullYear = year > 30 ? 1900 + year : 2000 + year;
        parsed.birthDate = `${fullYear}-${month}-${day}`;
      }
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
