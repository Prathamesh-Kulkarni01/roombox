
'use server';
/**
 * @fileOverview An AI flow to verify guest KYC documents.
 * - verifyKyc - Compares an ID document with a selfie for verification.
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
  isIdValid: z.boolean().describe("Whether the provided ID document appears to be a legitimate government-issued ID card."),
  isFaceMatch: z.boolean().describe("Whether the face in the ID document matches the face in the selfie."),
  reason: z.string().describe("A brief explanation for the verification result, especially if it fails."),
});
export type VerifyKycOutput = z.infer<typeof VerifyKycOutputSchema>;

export async function verifyKyc(input: VerifyKycInput): Promise<VerifyKycOutput> {
  return verifyKycFlow(input);
}

const kycPrompt = ai.definePrompt({
  name: 'kycVerificationPrompt',
  input: {schema: VerifyKycInputSchema},
  output: {schema: VerifyKycOutputSchema},
  prompt: `You are an expert KYC verification agent. Your task is to analyze the provided ID document and a selfie to verify a person's identity.

  1.  **Analyze the ID Document**: Examine the document image to determine if it looks like a valid, government-issued ID card (like an Aadhaar card, PAN card, or Driver's License). It should not be a random picture. Set \`isIdValid\` to true if it looks legitimate, otherwise false.
  2.  **Compare Faces**: Compare the face on the ID document with the face in the selfie. **Important:** Be aware that the photo on the ID might be from childhood or many years ago. Look for consistent underlying facial features (like eye shape, nose structure) rather than an exact match of current appearance. If you detect a significant age gap but believe it's the same person, consider it a match.
  3.  **Provide a Reason**: Briefly explain your decision in the \`reason\` field. For example, "ID is valid and faces match." or "The ID document does not look like a valid government ID." or "Faces match despite a significant age difference." or "The face in the selfie does not match the ID card."

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
