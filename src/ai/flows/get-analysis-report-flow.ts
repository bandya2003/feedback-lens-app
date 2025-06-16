
'use server';
/**
 * @fileOverview A Genkit flow for fetching a single saved analysis report.
 *
 * - getAnalysisReport - Fetches the processed data and details for a specific analysis ID.
 * - GetAnalysisReportInput - Schema for the input (analysisId).
 * - GetAnalysisReportOutput - Schema for the output (processedData, analysisDetails or null).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { firestore } from '@/lib/firebaseAdmin';
import { 
    type ProcessedFeedbackDataForSave, 
    ProcessedFeedbackDataSchema 
} from '@/ai/schemas/processed-data-schema';

const GetAnalysisReportInputSchema = z.object({
  analysisId: z.string().describe("The Firestore document ID of the analysis to fetch."),
});
export type GetAnalysisReportInput = z.infer<typeof GetAnalysisReportInputSchema>;

const AnalysisDetailsSchema = z.object({
  id: z.string().describe("The Firestore document ID of the analysis."),
  name: z.string().describe("The user-defined name of the analysis report."),
  createdAt: z.string().datetime({ offset: true }).describe("ISO 8601 datetime string of when the report was created."),
  sourceFileName: z.string().describe("Original name of the uploaded CSV file."),
});

const GetAnalysisReportOutputSchema = z.object({
  processedData: ProcessedFeedbackDataSchema,
  analysisDetails: AnalysisDetailsSchema,
}).nullable(); // Output can be null if report not found

// Adjusted type to match the new output schema
export type GetAnalysisReportOutput = {
  processedData: ProcessedFeedbackDataForSave;
  analysisDetails: z.infer<typeof AnalysisDetailsSchema>;
} | null;


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
  async (input): Promise<GetAnalysisReportOutput> => {
    try {
      const docRef = firestore.collection('analyses').doc(input.analysisId);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        console.warn(`Analysis report with ID ${input.analysisId} not found.`);
        return null;
      }

      const data = docSnap.data();
      if (!data || !data.processedData || !data.analysisName || !data.createdAt || !data.sourceFileName) {
        console.warn(`Report data incomplete for ID ${input.analysisId}. Document data:`, data);
        return null;
      }

      try {
        const parsedProcessedData = ProcessedFeedbackDataSchema.parse(data.processedData);
        
        const reportOutput: NonNullable<GetAnalysisReportOutput> = {
          processedData: parsedProcessedData as ProcessedFeedbackDataForSave,
          analysisDetails: {
            id: docSnap.id,
            name: data.analysisName,
            // Firestore Timestamp to ISO string
            createdAt: data.createdAt.toDate().toISOString(), 
            sourceFileName: data.sourceFileName,
          }
        };
        return reportOutput;

      } catch (validationError) {
          console.error(`Validation error for report ID ${input.analysisId}:`, validationError);
          return null; 
      }

    } catch (error: any) {
      console.error(`Error fetching analysis report ${input.analysisId} from Firestore:`, error);
      throw new Error(`Failed to fetch report: ${error.message}`);
    }
  }
);
