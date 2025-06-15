// use server'
'use server';
/**
 * @fileOverview This file contains the Genkit flow for analyzing the sentiment of customer feedback.
 *
 * - analyzeFeedbackSentiment - A function that analyzes the sentiment of customer feedback.
 * - AnalyzeFeedbackSentimentInput - The input type for the analyzeFeedbackSentiment function.
 * - AnalyzeFeedbackSentimentOutput - The return type for the analyzeFeedbackSentiment function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeFeedbackSentimentInputSchema = z.object({
  feedbackText: z
    .string()
    .describe('The text of the customer feedback to analyze.'),
});
export type AnalyzeFeedbackSentimentInput = z.infer<
  typeof AnalyzeFeedbackSentimentInputSchema
>;

const AnalyzeFeedbackSentimentOutputSchema = z.object({
  sentiment: z
    .enum(['positive', 'negative', 'neutral'])
    .describe('The sentiment of the feedback.'),
  score: z
    .number()
    .min(-1)
    .max(1)
    .describe(
      'A numerical score representing the sentiment, ranging from -1 (negative) to 1 (positive).'
    ),
  reason: z
    .string()
    .describe('The reasoning behind the sentiment analysis.'),
});
export type AnalyzeFeedbackSentimentOutput = z.infer<
  typeof AnalyzeFeedbackSentimentOutputSchema
>;

export async function analyzeFeedbackSentiment(
  input: AnalyzeFeedbackSentimentInput
): Promise<AnalyzeFeedbackSentimentOutput> {
  return analyzeFeedbackSentimentFlow(input);
}

const analyzeFeedbackSentimentPrompt = ai.definePrompt({
  name: 'analyzeFeedbackSentimentPrompt',
  input: {schema: AnalyzeFeedbackSentimentInputSchema},
  output: {schema: AnalyzeFeedbackSentimentOutputSchema},
  prompt: `You are an AI expert in sentiment analysis. Your task is to analyze the sentiment of the given customer feedback and provide a sentiment, a numerical score, and a brief reasoning.

Analyze the following feedback:

Feedback: {{{feedbackText}}}

Output in JSON format:
{
  "sentiment": "positive | negative | neutral",
  "score": "A numerical score between -1 and 1, with -1 being very negative and 1 being very positive",
  "reason": "Briefly explain why you chose the given sentiment and score"
}
`,
});

const analyzeFeedbackSentimentFlow = ai.defineFlow(
  {
    name: 'analyzeFeedbackSentimentFlow',
    inputSchema: AnalyzeFeedbackSentimentInputSchema,
    outputSchema: AnalyzeFeedbackSentimentOutputSchema,
  },
  async input => {
    const {output} = await analyzeFeedbackSentimentPrompt(input);
    return output!;
  }
);
