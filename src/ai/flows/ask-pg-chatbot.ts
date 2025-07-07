'use server';

/**
 * @fileOverview A chatbot flow for answering guest questions about a PG.
 *
 * - askPgChatbot - A function that answers guest questions based on PG context.
 * - AskPgChatbotInput - The input type for the askPgChatbot function.
 * - AskPgChatbotOutput - The return type for the askPgChatbot function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AskPgChatbotInputSchema = z.object({
  question: z.string().describe('The guest\'s question.'),
  pgContext: z.object({
    name: z.string(),
    rules: z.array(z.string()),
    amenities: z.array(z.string()),
    menu: z.any(),
  }).describe('The context of the PG, including rules, amenities, and menu.'),
});
export type AskPgChatbotInput = z.infer<typeof AskPgChatbotInputSchema>;

const AskPgChatbotOutputSchema = z.object({
  answer: z.string().describe('The AI-generated answer to the guest\'s question.'),
});
export type AskPgChatbotOutput = z.infer<typeof AskPgChatbotOutputSchema>;

export async function askPgChatbot(input: AskPgChatbotInput): Promise<AskPgChatbotOutput> {
  return askPgChatbotFlow(input);
}

const askPgChatbotPrompt = ai.definePrompt({
  name: 'askPgChatbotPrompt',
  input: {schema: AskPgChatbotInputSchema},
  output: {schema: AskPgChatbotOutputSchema},
  prompt: `You are a friendly and helpful assistant for "{{pgContext.name}}". Your role is to answer questions from residents based ONLY on the information provided below. Be concise and polite. If the information is not available, say "I don't have information about that. Please contact the PG manager."

  Here is the information about the PG:
  - PG Name: {{pgContext.name}}
  - House Rules: {{#each pgContext.rules}}- {{this}}\n{{/each}}
  - Amenities Provided: {{#each pgContext.amenities}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}.
  - Today's Menu: You can provide menu details if asked, based on the JSON provided.

  Here is the full weekly menu for context:
  \`\`\`json
  {{{json pgContext.menu}}}
  \`\`\`

  Now, please answer the following question from a resident:
  Question: "{{{question}}}"
  `,
});


const askPgChatbotFlow = ai.defineFlow(
  {
    name: 'askPgChatbotFlow',
    inputSchema: AskPgChatbotInputSchema,
    outputSchema: AskPgChatbotOutputSchema,
  },
  async input => {
    const {output} = await askPgChatbotPrompt(input);
    return output!;
  }
);
