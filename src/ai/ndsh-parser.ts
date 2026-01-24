import { ai } from './genkit';
import { googleAI } from '@genkit-ai/google-genai';

export interface NDSHPayment {
  year: number;
  month: number;
  organization: string;
  paid: boolean;
  salary?: number;
}

export interface NDSHParsedData {
  employeeInfo?: {
    lastName?: string;
    firstName?: string;
    registrationNumber?: string;
  };
  payments: NDSHPayment[];
  summary: {
    totalYears: number;
    totalMonths: number;
    hasGaps: boolean;
    gapMonths: string[];
    longestEmployment: {
      organization: string;
      months: number;
    };
  };
}

const NDSH_SYSTEM_PROMPT = `Чи бол Монголын Нийгмийн даатгалын шимтгэл төлөлтийн лавлагааг задлан шинжлэх эксперт AI.

Энэ лавлагааны стандарт формат:
- Гарчиг: "НИЙГМИЙН ДААТГАЛЫН ЕРӨНХИЙ ГАЗАР" / "НИЙГМИЙН ДААТГАЛЫН ШИМТГЭЛ ТӨЛӨЛТИЙН ТАЛААРХ ТОДОРХОЙЛОЛТ"
- Даатгуулагчийн мэдээлэл: Овог, Нэр, Регистр
- Хүснэгт баганууд:
  # | Хэлтсийн нэр | Ажил олгогчийн код | Ажил олгогчийн нэр | Он | Сар | Даатгуулагчийн цалин | Даатгуулагчийн төлөх шимтгэл | Ажил олгогч шимтгэл төлсөн эсэх

Төлсөн эсэх баганы утгууд:
- "Төлсөн" = paid: true
- "Төлөөгүй" = paid: false`;

const NDSH_EXTRACT_PROMPT = `
Дээрх НДШ лавлагаанаас БҮХИЙ Л МӨРҮҮДИЙГ задлаж JSON болго.

ЗААВАЛ буцаах формат:
{
  "employeeInfo": {
    "lastName": "Овог",
    "firstName": "Нэр",
    "registrationNumber": "Регистрийн дугаар"
  },
  "payments": [
    { "year": 2025, "month": 10, "organization": "БАЙГУУЛЛАГЫН НЭР", "paid": true },
    { "year": 2025, "month": 9, "organization": "БАЙГУУЛЛАГЫН НЭР", "paid": true }
  ]
}

ЧУХАЛ ДҮРЭМ:
1. Хүснэгтийн БҮХ мөрийг payments массивт оруул
2. "Ажил олгогчийн нэр" баганаас organization-ийг ав
3. "Он" баганаас year-ийг ав (тоо)
4. "Сар" баганаас month-ийг ав (1-12 тоо)
5. "Ажил олгогч шимтгэл төлсөн эсэх" = "Төлсөн" бол paid: true
6. Олон хуудастай бол БҮГДИЙГ нэгтгэ
7. summary хэсэг ҮҮСГЭХ ШААРДЛАГАГҮЙ - зөвхөн payments массив

ЗӨВХӨН ЦЭВЭР JSON буцаа, тайлбар бичих ХЭРЭГГҮЙ!`;

function cleanJsonResponse(raw: string): string {
  let str = raw.trim();
  
  // Remove markdown code blocks
  str = str.replace(/^```(?:json)?\s*/gi, '');
  str = str.replace(/\s*```$/gi, '');
  str = str.replace(/```/g, '');
  
  // Find the JSON object
  const startIdx = str.indexOf('{');
  const endIdx = str.lastIndexOf('}');
  
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    str = str.substring(startIdx, endIdx + 1);
  }
  
  // Clean up common issues
  str = str.replace(/,\s*}/g, '}');
  str = str.replace(/,\s*]/g, ']');
  
  return str.trim();
}

function parseJsonResponse(raw: string): NDSHParsedData {
  console.log('[NDSH Parser] Raw AI response length:', raw.length);
  
  const cleaned = cleanJsonResponse(raw);
  console.log('[NDSH Parser] Cleaned response length:', cleaned.length);
  
  try {
    const parsed = JSON.parse(cleaned);
    
    // Extract payments
    let payments: NDSHPayment[] = [];
    
    if (parsed.payments && Array.isArray(parsed.payments)) {
      payments = parsed.payments
        .filter((p: any) => p && (p.year || p.Он) && (p.month || p.Сар))
        .map((p: any) => ({
          year: parseInt(p.year || p.Он) || 0,
          month: parseInt(p.month || p.Сар) || 0,
          organization: p.organization || p['Ажил олгогчийн нэр'] || 'Тодорхойгүй',
          paid: p.paid === true || p.paid === 'true' || p['Ажил олгогч шимтгэл төлсөн эсэх'] === 'Төлсөн'
        }))
        .filter((p: NDSHPayment) => p.year > 0 && p.month >= 1 && p.month <= 12);
    }
    
    // Sort payments by year desc, then month desc
    payments.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
    
    // Calculate summary
    const paidPayments = payments.filter(p => p.paid);
    const years = new Set(paidPayments.map(p => p.year));
    
    // Find longest employment
    const orgCounts: Record<string, number> = {};
    paidPayments.forEach(p => {
      const orgKey = p.organization.toUpperCase().replace(/\s+ХХК$/i, '').trim();
      orgCounts[orgKey] = (orgCounts[orgKey] || 0) + 1;
    });
    const sortedOrgs = Object.entries(orgCounts).sort((a, b) => b[1] - a[1]);
    const longestOrg = sortedOrgs[0];
    
    // Detect gaps (simplified)
    const gapMonths: string[] = [];
    
    const result: NDSHParsedData = {
      employeeInfo: parsed.employeeInfo,
      payments,
      summary: {
        totalYears: years.size,
        totalMonths: paidPayments.length,
        hasGaps: gapMonths.length > 0,
        gapMonths,
        longestEmployment: longestOrg 
          ? { organization: longestOrg[0], months: longestOrg[1] }
          : { organization: '', months: 0 }
      }
    };
    
    console.log('[NDSH Parser] Parsed successfully:', payments.length, 'payments');
    return result;
  } catch (e) {
    console.error('[NDSH Parser] JSON parse error:', e);
    console.error('[NDSH Parser] First 1000 chars:', cleaned.substring(0, 1000));
    
    // Return empty result
    return {
      payments: [],
      summary: {
        totalYears: 0,
        totalMonths: 0,
        hasGaps: false,
        gapMonths: [],
        longestEmployment: { organization: '', months: 0 }
      }
    };
  }
}

export async function extractNDSHFromImage(
  imageDataUrl: string,
  mimeType: string
): Promise<NDSHParsedData> {
  console.log('[NDSH Parser] Calling AI for image extraction...');
  
  const { text } = await ai.generate({
    model: googleAI.model('gemini-2.5-flash'),
    system: NDSH_SYSTEM_PROMPT,
    prompt: [
      { media: { url: imageDataUrl, contentType: mimeType } },
      { text: NDSH_EXTRACT_PROMPT },
    ],
    config: { 
      temperature: 0.1,
      topP: 0.8,
      maxOutputTokens: 32768,
    },
  });
  
  console.log('[NDSH Parser] AI response received, length:', text?.length || 0);
  
  if (!text?.trim()) {
    console.error('[NDSH Parser] AI returned empty response');
    throw new Error('AI хоосон хариу буцаалаа');
  }
  
  return parseJsonResponse(text);
}

export async function extractNDSHFromText(inputText: string): Promise<NDSHParsedData> {
  console.log('[NDSH Parser] Calling AI for text extraction...');
  
  const { text } = await ai.generate({
    model: googleAI.model('gemini-2.5-flash'),
    system: NDSH_SYSTEM_PROMPT,
    prompt: `НДШ төлөлтийн лавлагаа:\n\n${inputText}\n\n${NDSH_EXTRACT_PROMPT}`,
    config: { 
      temperature: 0.1,
      topP: 0.8,
      maxOutputTokens: 32768,
    },
  });
  
  console.log('[NDSH Parser] AI response received, length:', text?.length || 0);
  
  if (!text?.trim()) {
    console.error('[NDSH Parser] AI returned empty response');
    throw new Error('AI хоосон хариу буцаалаа');
  }
  
  return parseJsonResponse(text);
}
