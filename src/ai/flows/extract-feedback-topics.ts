// This file is no longer used as topic extraction is now part of the batch processing flow.
// Kept for reference or if single-item analysis is needed elsewhere in the future.
// Consider deleting if no longer relevant.
'use server';

/**
 * @fileOverview Extracts the main topics discussed in customer feedback.
 * @deprecated Replaced by analyze-feedback-batch.ts
 *
 * - extractFeedbackTopics - A function that extracts topics from feedback.
 * - ExtractFeedbackTopicsInput - The input type for the extractFeedbackTopics function.
 * - ExtractFeedbackTopicsOutput - The return type for the extractFeedbackTopics function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractFeedbackTopicsInputSchema = z.object({
  feedbackText: z.string().describe('The customer feedback text to analyze.'),
});
export type ExtractFeedbackTopicsInput = z.infer<typeof ExtractFeedbackTopicsInputSchema>;

const ExtractFeedbackTopicsOutputSchema = z.object({
  topics: z
    .array(z.string())
    .describe('The main topics discussed in the feedback.'),
});
export type ExtractFeedbackTopicsOutput = z.infer<typeof ExtractFeedbackTopicsOutputSchema>;

export async function extractFeedbackTopics(input: ExtractFeedbackTopicsInput): Promise<ExtractFeedbackTopicsOutput> {
  return extractFeedbackTopicsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractFeedbackTopicsPrompt',
  input: {schema: ExtractFeedbackTopicsInputSchema},
  output: {schema: ExtractFeedbackTopicsOutputSchema},
  prompt: `You are an expert in analyzing customer feedback. Your goal is to identify the main topics discussed in the feedback text.

  Analyze the following feedback and extract the key topics. The number of topics identified should be proportional to the length and complexity of the feedback; shorter feedback should have fewer topics.

  Feedback Text: {{{feedbackText}}}
  `,
});

const extractFeedbackTopicsFlow = ai.defineFlow(
  {
    name: 'extractFeedbackTopicsFlow',
    inputSchema: ExtractFeedbackTopicsInputSchema,
    outputSchema: ExtractFeedbackTopicsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

