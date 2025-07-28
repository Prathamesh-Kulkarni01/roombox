
'use server';
/**
 * @fileOverview An AI flow to extract information from guest KYC documents for manual verification.
 * - verifyKyc - Extracts details from an ID document for an owner to review.
 * - VerifyKycInput - Input for the verification flow.
 * - VerifyKycOutput - Output from the verification flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const VerifyKycInputSchema = z.object({
  idDocumentUri: z.string().describe("A data URI of the guest's ID document (e.g., Aadhaar card). Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
  selfieUri: z.string().describe("A data URI of the guest's live photo (selfie). Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type VerifyKycInput = z.infer<typeof VerifyKycInputSchema>;

const VerifyKycOutputSchema = z.object({
  isIdValidDocument: z.boolean().describe("Whether the provided ID document appears to be a legitimate government-issued ID card and not a random image."),
  isSelfieValid: z.boolean().describe("Whether the selfie image contains a clear human face."),
  extractedName: z.string().optional().describe("The full name extracted from the ID document, if available."),
  extractedDob: z.string().optional().describe("The date of birth extracted from the ID document, if available."),
  extractedIdNumber: z.string().optional().describe("The ID number (e.g., Aadhaar number) extracted from the document, if available."),
  reason: z.string().describe("A brief explanation for the verification result, especially if it fails."),
});
export type VerifyKycOutput = z.infer<typeof VerifyKycOutputSchema>;

export async function verifyKyc(input: VerifyKycInput): Promise<VerifyKycOutput> {
  return verifyKycFlow(input);
}

const kycPrompt = ai.definePrompt({
  name: 'kycExtractionPrompt',
  input: {schema: VerifyKycInputSchema},
  output: {schema: VerifyKycOutputSchema},
  prompt: `You are an expert KYC verification agent. Your task is to analyze the provided ID document and a selfie.

  1.  **Analyze the ID Document**: Examine the document image.
      - Determine if it looks like a valid government-issued ID card (like an Aadhaar card, PAN card, or Driver's License). Set \`isIdValidDocument\` to true if it looks legitimate, otherwise false.
      - Extract the full name, date of birth (DOB), and the main ID number from the document. If a field cannot be found, leave it empty.

  2.  **Analyze the Selfie**: Examine the selfie image.
      - Determine if it contains a clear, single human face. Set \`isSelfieValid\` to true if it does.

  3.  **Provide a Reason**: Briefly summarize your findings in the \`reason\` field. For example, "Successfully extracted details from a valid-looking ID card." or "The ID document image is unclear."

  ID Document:
  {{media url=idDocumentUri}}

  Selfie Photo:
  {{media url=selfieUri}}
  `,
});

const verifyKycFlow = ai.defineFlow(
  {
    name: 'verifyKycFlow',
    inputSchema: VerifyKycInputSchema,
    outputSchema: VerifyKycOutputSchema,
  },
  async input => {
    const {output} = await kycPrompt(input);
    return output!;
  }
);
