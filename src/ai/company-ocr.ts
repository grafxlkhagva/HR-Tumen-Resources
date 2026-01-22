import { googleGenAI } from './genkit';

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

export async function extractCompanyInfoFromImage(imageData: string, mimeType: string): Promise<CompanyInfo> {
  try {
    const model = googleGenAI.generate({
      model: 'gemini-1.5-flash',
      config: {
        temperature: 0.1,
      },
    });

    const prompt = `
You are an expert at extracting company information from business documents, certificates, and registration papers.

Please analyze the uploaded image/document and extract the following company information in JSON format:

Required fields to extract:
- name: Company name (as displayed on document)
- legalName: Legal entity name (if different from display name)
- registrationNumber: Company registration/business license number
- taxId: Tax identification number/VAT number
- industry: Business sector/industry type
- establishedDate: Date of establishment/incorporation (YYYY-MM-DD format)
- ceo: CEO/Director/General Manager name
- address: Company registered address
- phoneNumber: Contact phone number
- contactEmail: Contact email address
- website: Company website URL
- employeeCount: Number of employees (if mentioned)

Instructions:
1. Only extract information that is clearly visible in the document
2. Return dates in YYYY-MM-DD format
3. For phone numbers, include only digits and basic formatting (+, -, spaces)
4. If a field is not found or unclear, omit it from the response
5. Return only valid JSON, no additional text or explanations

Example output format:
{
  "name": "ABC Company LLC",
  "registrationNumber": "123456789",
  "establishedDate": "2020-01-15",
  "ceo": "John Smith",
  "address": "123 Main St, City, Country"
}
`;

    const result = await model.generate({
      prompt,
      media: {
        contentType: mimeType,
        url: imageData,
      },
    });

    const response = result.response();

    // Parse the JSON response
    try {
      const extractedData = JSON.parse(response.text());
      return extractedData as CompanyInfo;
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Try to extract JSON from the response if it's wrapped in text
      const jsonMatch = response.text().match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as CompanyInfo;
      }
      throw new Error('Invalid JSON response from AI');
    }
  } catch (error) {
    console.error('Error extracting company info:', error);
    throw new Error('Failed to extract company information from the document');
  }
}

export async function extractCompanyInfoFromText(text: string): Promise<CompanyInfo> {
  try {
    const model = googleGenAI.generate({
      model: 'gemini-1.5-flash',
      config: {
        temperature: 0.1,
      },
    });

    const prompt = `
You are an expert at extracting company information from business documents and text.

Please analyze the provided text and extract the following company information in JSON format:

Required fields to extract:
- name: Company name
- legalName: Legal entity name (if different from display name)
- registrationNumber: Company registration/business license number
- taxId: Tax identification number/VAT number
- industry: Business sector/industry type
- establishedDate: Date of establishment/incorporation (YYYY-MM-DD format)
- ceo: CEO/Director/General Manager name
- address: Company registered address
- phoneNumber: Contact phone number
- contactEmail: Contact email address
- website: Company website URL
- employeeCount: Number of employees

Instructions:
1. Only extract information that is clearly present in the text
2. Return dates in YYYY-MM-DD format
3. For phone numbers, include only digits and basic formatting (+, -, spaces)
4. If a field is not found, omit it from the response
5. Return only valid JSON, no additional text or explanations

Text to analyze:
${text}

Return the extracted information as JSON.
`;

    const result = await model.generate({
      prompt,
    });

    const response = result.response();

    try {
      const extractedData = JSON.parse(response.text());
      return extractedData as CompanyInfo;
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Try to extract JSON from the response
      const jsonMatch = response.text().match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as CompanyInfo;
      }
      throw new Error('Invalid JSON response from AI');
    }
  } catch (error) {
    console.error('Error extracting company info from text:', error);
    throw new Error('Failed to extract company information from the text');
  }
}