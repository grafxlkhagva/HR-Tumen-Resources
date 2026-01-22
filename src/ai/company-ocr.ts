import { ai } from './genkit';
import { googleAI } from '@genkit-ai/google-genai';

export interface CompanyInfo {
  name?: string;
  legalName?: string;
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

const EXTRACT_PROMPT = `
You are an expert at extracting company information from business documents, certificates, and registration papers.

Extract the following fields as JSON. Use only clearly visible information. Omit fields not found.
- name: Company name (as displayed)
- legalName: Legal entity name (if different)
- registrationNumber: Registration/business license number
- taxId: Tax identification number
- industry: Business sector
- establishedDate: YYYY-MM-DD
- ceo: CEO/Director name
- address: Registered address
- phoneNumber: Contact phone (digits, +, -)
- contactEmail: Contact email
- website: Company website URL
- employeeCount: Number of employees (if mentioned)

Return ONLY valid JSON, no markdown or explanation. Example: {"name":"ABC LLC","registrationNumber":"123"}
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
