'use server';

/**
 * @fileOverview Хүний нөөцийн баримт бичгийг хамгийн сүүлийн үеийн хөдөлмөрийн хууль тогтоомжид нийцүүлэн шинэчлэхэд зориулсан хиймэл оюун ухааны зөвлөмжийг өгдөг.
 *
 * - suggestComplianceUpdates - Хүний нөөцийн баримт бичгийг оролт болгон авч, нийцлийн шинэчлэлтийн зөвлөмжийг буцаадаг функц.
 * - SuggestComplianceUpdatesInput - suggestComplianceUpdates функцийн оролтын төрөл.
 * - SuggestComplianceUpdatesOutput - suggestComplianceUpdates функцийн буцаах төрөл.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestComplianceUpdatesInputSchema = z.object({
  documentText: z
    .string()
    .describe('Нийцлийн хувьд хянагдах хүний нөөцийн баримт бичгийн текстэн агуулга.'),
});
export type SuggestComplianceUpdatesInput = z.infer<
  typeof SuggestComplianceUpdatesInputSchema
>;

const SuggestComplianceUpdatesOutputSchema = z.object({
  suggestions: z
    .string()
    .describe(
      'Хүний нөөцийн баримт бичгийг хамгийн сүүлийн үеийн хөдөлмөрийн хууль тогтоомжид нийцүүлэхийн тулд шинэчлэх хиймэл оюун ухааны зөвлөмж.'
    ),
});
export type SuggestComplianceUpdatesOutput = z.infer<
  typeof SuggestComplianceUpdatesOutputSchema
>;

export async function suggestComplianceUpdates(
  input: SuggestComplianceUpdatesInput
): Promise<SuggestComplianceUpdatesOutput> {
  return suggestComplianceUpdatesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestComplianceUpdatesPrompt',
  input: {schema: SuggestComplianceUpdatesInputSchema},
  output: {schema: SuggestComplianceUpdatesOutputSchema},
  prompt: `Та бол Хүний нөөцийн хэлтэст зориулсан хиймэл оюунд суурилсан хууль зүйн зөвлөх юм.

Та хүний нөөцийн баримт бичгийн агуулгыг хүлээн авах бөгөөд таны даалгавар бол хамгийн сүүлийн үеийн хөдөлмөрийн хууль тогтоомж, дүрэм журамд нийцүүлэхийн тулд тодорхой, хэрэгжүүлэхүйц шинэчлэлтийн зөвлөмжийг өгөх явдал юм.

Баримт бичгийн агуулга: {{{documentText}}}

Нийцлийн зөвлөмж:`,
});

const suggestComplianceUpdatesFlow = ai.defineFlow(
  {
    name: 'suggestComplianceUpdatesFlow',
    inputSchema: SuggestComplianceUpdatesInputSchema,
    outputSchema: SuggestComplianceUpdatesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
