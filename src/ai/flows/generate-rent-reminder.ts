// src/ai/flows/generate-rent-reminder.ts
'use server';

/**
 * @fileOverview AI-powered rent reminder generator for PG Owners.
 *
 * - generateRentReminder - Generates a polite rent reminder message.
 * - GenerateRentReminderInput - Input type for the generateRentReminder function.
 * - GenerateRentReminderOutput - Return type for the generateRentReminder function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateRentReminderInputSchema = z.object({
  guestName: z.string().describe('The name of the guest.'),
  rentAmount: z.number().describe('The amount of rent due.'),
  dueDate: z.string().describe('The due date for the rent payment (e.g., July 1, 2024).'),
  pgName: z.string().describe('The name of the PG.'),
  paymentLink: z.string().url().describe('A unique URL for the tenant to pay their rent directly.'),
});

export type GenerateRentReminderInput = z.infer<typeof GenerateRentReminderInputSchema>;

const GenerateRentReminderOutputSchema = z.object({
  reminderMessage: z.string().describe('The generated rent reminder message.'),
});

export type GenerateRentReminderOutput = z.infer<typeof GenerateRentReminderOutputSchema>;

export async function generateRentReminder(input: GenerateRentReminderInput): Promise<GenerateRentReminderOutput> {
  return generateRentReminderFlow(input);
}

const generateRentReminderPrompt = ai.definePrompt({
  name: 'generateRentReminderPrompt',
  input: {schema: GenerateRentReminderInputSchema},
  output: {schema: GenerateRentReminderOutputSchema},
  prompt: `You are an AI assistant helping PG Owners generate polite rent reminder messages to send to their guests via WhatsApp or SMS.

  Generate a friendly and polite rent reminder message for the following guest:

  Guest Name: {{{guestName}}}
  Rent Amount: ₹{{{rentAmount}}}
  Due Date: {{{dueDate}}}
  PG Name: {{{pgName}}}
  Payment Link: {{{paymentLink}}}

The message should:

*   Be concise and to the point.
*   Maintain a professional tone.
*   Include the guest's name, rent amount, and due date.
*   Mention the PG name
*   **Crucially, include the full payment link at the end of the message so they can pay immediately.**
*   Be suitable for sending via WhatsApp or SMS.

  Output the rent reminder message.`,
});

const generateRentReminderFlow = ai.defineFlow(
  {
    name: 'generateRentReminderFlow',
    inputSchema: GenerateRentReminderInputSchema,
    outputSchema: GenerateRentReminderOutputSchema,
  },
  async input => {
    const {output} = await generateRentReminderPrompt(input);
    return output!;
  }
);
