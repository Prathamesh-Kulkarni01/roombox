// src/ai/flows/generate-seo-content.ts
'use server';

/**
 * @fileOverview Flow for generating SEO-friendly content for PG listings.
 *
 * - generateSeoContent - A function that generates SEO content for PG listings.
 * - GenerateSeoContentInput - The input type for the generateSeoContent function.
 * - GenerateSeoContentOutput - The output type for the generateSeoContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateSeoContentInputSchema = z.object({
  pgName: z.string().describe('The name of the PG listing.'),
  location: z.string().describe('The location of the PG.'),
  amenities: z.string().describe('A comma-separated list of amenities offered by the PG.'),
  priceRange: z.string().describe('The price range for the PG.'),
  genderRestriction: z.string().describe('The gender restriction for the PG (e.g., Male, Female, Co-ed).'),
});
export type GenerateSeoContentInput = z.infer<typeof GenerateSeoContentInputSchema>;

const GenerateSeoContentOutputSchema = z.object({
  title: z.string().describe('The SEO-friendly title for the PG listing.'),
  description: z.string().describe('The SEO-friendly description for the PG listing.'),
});
export type GenerateSeoContentOutput = z.infer<typeof GenerateSeoContentOutputSchema>;

export async function generateSeoContent(input: GenerateSeoContentInput): Promise<GenerateSeoContentOutput> {
  return generateSeoContentFlow(input);
}

const generateSeoContentPrompt = ai.definePrompt({
  name: 'generateSeoContentPrompt',
  input: {schema: GenerateSeoContentInputSchema},
  output: {schema: GenerateSeoContentOutputSchema},
  prompt: `You are an expert SEO content writer specializing in creating compelling and search engine friendly titles and descriptions for Paying Guest (PG) listings.

  Given the following information about a PG, generate an SEO-friendly title and description.

  PG Name: {{{pgName}}}
  Location: {{{location}}}
  Amenities: {{{amenities}}}
  Price Range: {{{priceRange}}}
  Gender Restriction: {{{genderRestriction}}}

  Ensure the title is concise, attention-grabbing, and includes relevant keywords. The description should be detailed, informative, and optimized for search engines to attract potential tenants.

  Output the title and description in a JSON format.
  `,
});

const generateSeoContentFlow = ai.defineFlow(
  {
    name: 'generateSeoContentFlow',
    inputSchema: GenerateSeoContentInputSchema,
    outputSchema: GenerateSeoContentOutputSchema,
  },
  async input => {
    const {output} = await generateSeoContentPrompt(input);
    return output!;
  }
);
