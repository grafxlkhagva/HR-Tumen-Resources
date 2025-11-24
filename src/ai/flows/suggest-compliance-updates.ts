'use server';

/**
 * @fileOverview Provides AI-powered suggestions for updating HR documents to ensure compliance with the latest labor laws.
 *
 * - suggestComplianceUpdates - A function that takes HR documents as input and returns compliance update suggestions.
 * - SuggestComplianceUpdatesInput - The input type for the suggestComplianceUpdates function.
 * - SuggestComplianceUpdatesOutput - The return type for the suggestComplianceUpdates function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestComplianceUpdatesInputSchema = z.object({
  documentText: z
    .string()
    .describe('The text content of the HR document to be reviewed for compliance.'),
});
export type SuggestComplianceUpdatesInput = z.infer<
  typeof SuggestComplianceUpdatesInputSchema
>;

const SuggestComplianceUpdatesOutputSchema = z.object({
  suggestions: z
    .string()
    .describe(
      'AI-powered suggestions for updating the HR document to ensure compliance with the latest labor laws.'
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
  prompt: `You are an AI-powered legal compliance assistant for HR departments.

You will receive the content of an HR document, and your task is to provide specific, actionable suggestions for updates to ensure compliance with the latest labor laws and regulations.

Document Content: {{{documentText}}}

Compliance Suggestions:`,
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
