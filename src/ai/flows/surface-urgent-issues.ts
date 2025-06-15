'use server';

/**
 * @fileOverview An AI agent that identifies urgent issues based on the volume of negative feedback.
 *
 * - surfaceUrgentIssues - A function that identifies urgent issues from customer feedback.
 * - SurfaceUrgentIssuesInput - The input type for the surfaceUrgentIssues function.
 * - SurfaceUrgentIssuesOutput - The return type for the surfaceUrgentIssues function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SurfaceUrgentIssuesInputSchema = z.object({
  feedbackData: z.string().describe('A JSON string containing an array of feedback objects. Each object should have a text field for the feedback comment and a sentiment field indicating the sentiment of the feedback.'),
});
export type SurfaceUrgentIssuesInput = z.infer<typeof SurfaceUrgentIssuesInputSchema>;

const SurfaceUrgentIssuesOutputSchema = z.object({
  urgentIssue: z.string().describe('The topic with the highest volume of negative feedback.'),
  overallSentiment: z.string().describe('A high-level summary of the overall sentiment of the feedback, such as "Overall sentiment is 75% Positive.".')
});
export type SurfaceUrgentIssuesOutput = z.infer<typeof SurfaceUrgentIssuesOutputSchema>;

export async function surfaceUrgentIssues(input: SurfaceUrgentIssuesInput): Promise<SurfaceUrgentIssuesOutput> {
  return surfaceUrgentIssuesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'surfaceUrgentIssuesPrompt',
  input: {schema: SurfaceUrgentIssuesInputSchema},
  output: {schema: SurfaceUrgentIssuesOutputSchema},
  prompt: `You are an expert UX researcher. Analyze the provided customer feedback data to identify urgent issues and summarize the overall sentiment.

  The input is a JSON string representing an array of feedback objects. Each object has a \"text\" field containing the feedback comment and a \"sentiment\" field indicating the sentiment of the feedback (positive, negative, or neutral).

  Identify the topic with the highest volume of negative feedback and set it as the \"urgentIssue\". Provide a high-level summary of the overall sentiment of the feedback and set it as the \"overallSentiment\".

  For example, if the \"Pricing\" topic has the most negative feedback, set urgentIssue to \"Pricing\". If 75% of the feedback is positive, set overallSentiment to \"Overall sentiment is 75% Positive.\".

  Here is the feedback data:
  {{{feedbackData}}}
  `,
});

const surfaceUrgentIssuesFlow = ai.defineFlow(
  {
    name: 'surfaceUrgentIssuesFlow',
    inputSchema: SurfaceUrgentIssuesInputSchema,
    outputSchema: SurfaceUrgentIssuesOutputSchema,
  },
  async input => {
    try {
      const feedback = JSON.parse(input.feedbackData);
      if (!Array.isArray(feedback)) {
        throw new Error('Feedback data must be a JSON array.');
      }

      const {output} = await prompt(input);
      return output!;
    } catch (error: any) {
      console.error('Error processing feedback data:', error);
      throw new Error(`Failed to process feedback data: ${error.message}`);
    }
  }
);

