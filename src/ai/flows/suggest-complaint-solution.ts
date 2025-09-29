'use server';

/**
 * @fileOverview An AI flow to suggest simple solutions for common tenant complaints.
 *
 * - suggestComplaintSolution - A function that provides an immediate suggestion for a complaint.
 * - SuggestComplaintSolutionInput - The input type for the suggestComplaintSolution function.
 * - SuggestComplaintSolutionOutput - The return type for the suggestComplaintSolution function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestComplaintSolutionInputSchema = z.object({
  category: z.string().describe("The category of the complaint (e.g., 'wifi', 'maintenance')."),
  description: z.string().describe("The tenant's description of the problem."),
});
export type SuggestComplaintSolutionInput = z.infer<typeof SuggestComplaintSolutionInputSchema>;

const SuggestComplaintSolutionOutputSchema = z.object({
  suggestion: z.string().describe("A simple, actionable suggestion for the tenant to try. If no obvious solution exists, this should be an empty string."),
});
export type SuggestComplaintSolutionOutput = z.infer<typeof SuggestComplaintSolutionOutputSchema>;

export async function suggestComplaintSolution(input: SuggestComplaintSolutionInput): Promise<SuggestComplaintSolutionOutput> {
  // Only provide suggestions for common, fixable issues.
  if (!['wifi', 'cleanliness', 'maintenance'].includes(input.category)) {
    return { suggestion: '' };
  }
  return suggestComplaintSolutionFlow(input);
}

const suggestComplaintSolutionPrompt = ai.definePrompt({
  name: 'suggestComplaintSolutionPrompt',
  input: {schema: SuggestComplaintSolutionInputSchema},
  output: {schema: SuggestComplaintSolutionOutputSchema},
  prompt: `You are a helpful assistant for a Paying Guest (PG) accommodation. A tenant is reporting an issue.
  Based on their complaint, provide one simple, actionable suggestion they can try right away.
  The goal is to resolve simple issues quickly.

  - If the issue is about Wi-Fi, suggest restarting the router.
  - If it's a simple maintenance issue (like a flickering bulb), suggest checking if it's screwed in tightly.
  - If it's about cleanliness, suggest notifying the cleaning staff on their next round.
  - For complex issues or if no simple solution is obvious, return an empty string for the suggestion.

  Complaint Category: {{{category}}}
  Complaint Description: "{{{description}}}"

  Provide a concise suggestion or an empty string.`,
});

const suggestComplaintSolutionFlow = ai.defineFlow(
  {
    name: 'suggestComplaintSolutionFlow',
    inputSchema: SuggestComplaintSolutionInputSchema,
    outputSchema: SuggestComplaintSolutionOutputSchema,
  },
  async (input) => {
    const {output} = await suggestComplaintSolutionPrompt(input);
    return output!;
  }
);
