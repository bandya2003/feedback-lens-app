
'use server';
/**
 * @fileOverview A Genkit flow for analyzing a batch of customer feedback items
 * for sentiment and topics.
 *
 * - analyzeFeedbackBatch - Analyzes a batch of feedback for sentiment and topics.
 * - AnalyzeFeedbackBatchInput - Schema for the entire input batch.
 * - AnalyzeFeedbackBatchOutput - Schema for the entire output from the AI.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Specific list of topics allowed
const ALLOWED_TOPICS = [
  "UI/UX", "Billing", "Performance", "Customer Support", 
  "Feature Request", "Mobile App", "API", "General"
] as const;

const AnalyzeFeedbackBatchInputItemSchema = z.object({
  id: z.string().describe("The unique identifier for the feedback comment."),
  feedbackText: z.string().describe('The text of the customer feedback to analyze.'),
});
export type AnalyzeFeedbackBatchInputItem = z.infer<typeof AnalyzeFeedbackBatchInputItemSchema>;

const AnalyzeFeedbackBatchInputSchema = z.array(AnalyzeFeedbackBatchInputItemSchema);
export type AnalyzeFeedbackBatchInput = z.infer<typeof AnalyzeFeedbackBatchInputSchema>;


const AnalyzeFeedbackBatchOutputItemSchema = z.object({
  id: z.string().describe("The original unique identifier of the comment."),
  sentiment: z
    .enum(['positive', 'negative', 'neutral'])
    .describe('The sentiment of the feedback (must be "positive", "negative", or "neutral").'),
  topics: z
    .array(z.enum(ALLOWED_TOPICS))
    .describe(`An array of relevant topics from the specific list: ${ALLOWED_TOPICS.join(', ')}.`),
});
export type AnalyzeFeedbackBatchOutputItem = z.infer<typeof AnalyzeFeedbackBatchOutputItemSchema>;

const AnalyzeFeedbackBatchOutputSchema = z.array(AnalyzeFeedbackBatchOutputItemSchema);
export type AnalyzeFeedbackBatchOutput = z.infer<typeof AnalyzeFeedbackBatchOutputSchema>;


export async function analyzeFeedbackBatch(
  input: AnalyzeFeedbackBatchInput
): Promise<AnalyzeFeedbackBatchOutput> {
  // Directly pass the array to the flow, the prompt will handle JSON stringification if needed by the model.
  return analyzeFeedbackBatchFlow(input);
}

const BATCH_READY_PROMPT_TEMPLATE = `
You are an expert data analyst specializing in customer feedback for a SaaS company. Your task is to process a batch of customer comments and for each individual comment, perform the following tasks:

1.  **Sentiment Analysis:** Classify the sentiment as exactly one of the following lowercase strings: "positive", "negative", or "neutral".
2.  **Topic Extraction:** Assign one or more relevant topics from this SPECIFIC list only: ["UI/UX", "Billing", "Performance", "Customer Support", "Feature Request", "Mobile App", "API", "General"]. Do not create any new topics. If no topic from the list is relevant, provide an empty array for topics.

Your final output MUST be a valid JSON array of objects, where each object represents a single comment. Each object must contain three keys: the original "id" of the comment (as provided in the input), the "sentiment" string, and a "topics" array of strings.

Here is the batch of comments to analyze:
{{{batch_of_comments_as_json_string}}}
`;


const analyzeFeedbackBatchPrompt = ai.definePrompt({
  name: 'analyzeFeedbackBatchPrompt',
  input: { schema: z.object({ batch_of_comments_as_json_string: z.string() }) }, // Prompt expects a JSON string
  output: { schema: AnalyzeFeedbackBatchOutputSchema }, // Expecting an array of analyzed items
  prompt: BATCH_READY_PROMPT_TEMPLATE,
  config: {
    // Potentially increase temperature slightly if topic diversity is low, but be cautious.
    // temperature: 0.5 
  }
});

const analyzeFeedbackBatchFlow = ai.defineFlow(
  {
    name: 'analyzeFeedbackBatchFlow',
    inputSchema: AnalyzeFeedbackBatchInputSchema, // Flow takes an array of items
    outputSchema: AnalyzeFeedbackBatchOutputSchema,
  },
  async (batchItems) => {
    // Convert the batchItems array to a JSON string for the prompt
    const batchAsJsonString = JSON.stringify(batchItems);
    
    const {output} = await analyzeFeedbackBatchPrompt({ batch_of_comments_as_json_string: batchAsJsonString });
    
    if (!output) {
      throw new Error("AI analysis returned no output for the batch.");
    }
    // Ensure the output matches the number of input items if necessary, or handle discrepancies.
    // For now, we trust the AI to return an item for each input based on the prompt.
    return output;
  }
);

