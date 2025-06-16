'use server';
/**
 * @fileOverview A Genkit flow for saving analysis results to Firestore.
 *
 * - saveAnalysis - Saves a complete analysis report.
 * - SaveAnalysisInput - Schema for the input data for saving.
 * - SaveAnalysisOutput - Schema for the output (e.g., ID of saved doc).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { admin, firestore } from '@/lib/firebaseAdmin'; // Import initialized admin and firestore


// Schemas for data to be saved, mirroring parts of ProcessedFeedbackData
const FeedbackSentimentLabelSchema = z.enum(['positive', 'negative', 'neutral']);

const RawFeedbackItemSchema = z.record(z.string()); // [key: string]: string

const FeedbackItemSchema = z.object({
  id: z.string(),
  originalIndex: z.number(),
  fullData: RawFeedbackItemSchema,
  feedbackText: z.string(),
  timestamp: z.string().datetime({ offset: true }).optional().describe("ISO 8601 datetime string if available"),
  sentiment: FeedbackSentimentLabelSchema.optional(),
  sentimentScore: z.number().optional(),
  topics: z.array(z.string()).optional(),
});

const SentimentDataPointSchema = z.object({
  date: z.string(),
  positive: z.number(),
  negative: z.number(),
  neutral: z.number(),
});

const TopicSentimentDistributionSchema = z.object({
  name: z.string(),
  positive: z.number(),
  negative: z.number(),
  neutral: z.number(),
  total: z.number(),
});

const KeyInsightsSchema = z.object({
  urgentIssue: z.string(),
  overallSentiment: z.string(),
}).nullable();

const ProcessedFeedbackDataSchema = z.object({
  feedbackItems: z.array(FeedbackItemSchema),
  sentimentOverTime: z.array(SentimentDataPointSchema),
  topicDistribution: z.array(TopicSentimentDistributionSchema),
  keyInsights: KeyInsightsSchema,
});
export type ProcessedFeedbackDataForSave = z.infer<typeof ProcessedFeedbackDataSchema>;


const SaveAnalysisInputSchema = z.object({
  userId: z.string().describe("Identifier for the user saving the analysis."),
  analysisName: z.string().describe("User-defined name for this analysis report."),
  sourceFileName: z.string().describe("Original name of the uploaded CSV file."),
  processedData: ProcessedFeedbackDataSchema.describe("The complete processed feedback data object."),
});
export type SaveAnalysisInput = z.infer<typeof SaveAnalysisInputSchema>;

const SaveAnalysisOutputSchema = z.object({
  analysisId: z.string().describe("The ID of the saved analysis document in Firestore."),
  message: z.string().describe("A success message."),
});
export type SaveAnalysisOutput = z.infer<typeof SaveAnalysisOutputSchema>;


export async function saveAnalysis(
  input: SaveAnalysisInput
): Promise<SaveAnalysisOutput> {
  return saveAnalysisFlow(input);
}


const saveAnalysisFlow = ai.defineFlow(
  {
    name: 'saveAnalysisFlow',
    inputSchema: SaveAnalysisInputSchema,
    outputSchema: SaveAnalysisOutputSchema,
  },
  async (input) => {
    try {
      const { userId, analysisName, sourceFileName, processedData } = input;
      
      const analysisDocRef = await firestore.collection('analyses').add({
        userId,
        analysisName,
        sourceFileName,
        processedData, // Firestore will handle the nested object
        createdAt: admin.firestore.FieldValue.serverTimestamp(), // Use server timestamp
      });

      return {
        analysisId: analysisDocRef.id,
        message: 'Analysis saved successfully.',
      };
    } catch (error: any) {
      console.error('Error saving analysis to Firestore:', error);
      // It's important to throw an error that Genkit can handle or that gives meaningful feedback.
      // For now, re-throwing a generic error. In a real app, you might want more specific error types.
      throw new Error(`Failed to save analysis: ${error.message}`);
    }
  }
);
