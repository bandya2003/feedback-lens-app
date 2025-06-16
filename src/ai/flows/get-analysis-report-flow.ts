
'use server';
/**
 * @fileOverview A Genkit flow for fetching a single saved analysis report.
 *
 * - getAnalysisReport - Fetches the processed data for a specific analysis ID.
 * - GetAnalysisReportInput - Schema for the input (analysisId).
 * - GetAnalysisReportOutput - Schema for the output (processedData or null).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { firestore } from '@/lib/firebaseAdmin';
// Re-using the schema defined in save-analysis-flow.ts for the processed data
import { type ProcessedFeedbackDataForSave, ProcessedFeedbackDataSchema as ProcessedFeedbackDataForSaveSchema } from './save-analysis-flow';

const GetAnalysisReportInputSchema = z.object({
  analysisId: z.string().describe("The Firestore document ID of the analysis to fetch."),
});
export type GetAnalysisReportInput = z.infer<typeof GetAnalysisReportInputSchema>;

// The output can be the processed data or null if not found
const GetAnalysisReportOutputSchema = ProcessedFeedbackDataForSaveSchema.nullable();
export type GetAnalysisReportOutput = z.infer<typeof GetAnalysisReportOutputSchema>;


export async function getAnalysisReport(
  input: GetAnalysisReportInput
): Promise<GetAnalysisReportOutput> {
  return getAnalysisReportFlow(input);
}

const getAnalysisReportFlow = ai.defineFlow(
  {
    name: 'getAnalysisReportFlow',
    inputSchema: GetAnalysisReportInputSchema,
    outputSchema: GetAnalysisReportOutputSchema,
  },
  async (input) => {
    try {
      const docRef = firestore.collection('analyses').doc(input.analysisId);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        console.warn(`Analysis report with ID ${input.analysisId} not found.`);
        return null;
      }

      const data = docSnap.data();
      if (data && data.processedData) {
        // We need to ensure the fetched data conforms to our schema,
        // especially if data structure might change or be inconsistent.
        // For now, we cast it, but in a production app, more robust validation might be needed.
        return data.processedData as ProcessedFeedbackDataForSave;
      } else {
        console.warn(`ProcessedData missing in report ID ${input.analysisId}.`);
        return null;
      }

    } catch (error: any) {
      console.error(`Error fetching analysis report ${input.analysisId} from Firestore:`, error);
      throw new Error(`Failed to fetch report: ${error.message}`);
    }
  }
);
