
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
// Import the schema and type from the new central location
import { 
    type ProcessedFeedbackDataForSave, 
    ProcessedFeedbackDataSchema 
} from '@/ai/schemas/processed-data-schema'; // Updated import

const GetAnalysisReportInputSchema = z.object({
  analysisId: z.string().describe("The Firestore document ID of the analysis to fetch."),
});
export type GetAnalysisReportInput = z.infer<typeof GetAnalysisReportInputSchema>;

// The output can be the processed data or null if not found
// Use the imported schema directly for the output definition
const GetAnalysisReportOutputSchema = ProcessedFeedbackDataSchema.nullable();
export type GetAnalysisReportOutput = ProcessedFeedbackDataForSave | null; // Adjusted type to match schema


export async function getAnalysisReport(
  input: GetAnalysisReportInput
): Promise<GetAnalysisReportOutput> { // Ensure Promise type matches the actual return
  return getAnalysisReportFlow(input);
}

const getAnalysisReportFlow = ai.defineFlow(
  {
    name: 'getAnalysisReportFlow',
    inputSchema: GetAnalysisReportInputSchema,
    outputSchema: GetAnalysisReportOutputSchema,
  },
  async (input): Promise<GetAnalysisReportOutput> => { // Explicit return type for clarity
    try {
      const docRef = firestore.collection('analyses').doc(input.analysisId);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        console.warn(`Analysis report with ID ${input.analysisId} not found.`);
        return null;
      }

      const data = docSnap.data();
      // Ensure data and processedData exist before trying to access
      if (data && data.processedData) {
        // Validate the fetched data against the schema.
        // Zod's .parse() will throw an error if it doesn't match.
        // For a nullable schema, you might need to handle the null case if data.processedData could be null itself.
        // Assuming processedData will always be an object if it exists.
        try {
          // Pass the data through Zod's parse method to ensure it conforms
          // to the ProcessedFeedbackDataSchema. This also acts as a type cast.
          const parsedData = ProcessedFeedbackDataSchema.parse(data.processedData);
          return parsedData as ProcessedFeedbackDataForSave; // Explicit cast to the TS type
        } catch (validationError) {
            console.error(`Validation error for report ID ${input.analysisId}:`, validationError);
            // Optionally, return null or throw a more specific error
            // if data structure from DB is unexpectedly different.
            return null; 
        }
      } else {
        console.warn(`ProcessedData missing or malformed in report ID ${input.analysisId}. Document data:`, data);
        return null;
      }

    } catch (error: any) {
      console.error(`Error fetching analysis report ${input.analysisId} from Firestore:`, error);
      throw new Error(`Failed to fetch report: ${error.message}`);
    }
  }
);
