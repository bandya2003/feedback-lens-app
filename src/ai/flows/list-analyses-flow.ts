
'use server';
/**
 * @fileOverview A Genkit flow for listing saved analysis reports for a user.
 *
 * - listAnalyses - Fetches a summary of saved reports.
 * - ListAnalysesInput - Schema for the input (userId).
 * - ListAnalysesOutput - Schema for the output (array of report summaries).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { firestore } from '@/lib/firebaseAdmin'; // Import initialized firestore

const ListAnalysesInputSchema = z.object({
  userId: z.string().describe("Identifier for the user whose analyses are to be listed."),
});
export type ListAnalysesInput = z.infer<typeof ListAnalysesInputSchema>;

const ListAnalysesOutputItemSchema = z.object({
  id: z.string().describe("The Firestore document ID of the analysis."),
  name: z.string().describe("The user-defined name of the analysis report."),
  date: z.string().describe("The date the analysis was saved, formatted as a readable string."),
});
export type ListAnalysesOutputItem = z.infer<typeof ListAnalysesOutputItemSchema>;

const ListAnalysesOutputSchema = z.array(ListAnalysesOutputItemSchema);
export type ListAnalysesOutput = z.infer<typeof ListAnalysesOutputSchema>;


export async function listAnalyses(
  input: ListAnalysesInput
): Promise<ListAnalysesOutput> {
  return listAnalysesFlow(input);
}

const listAnalysesFlow = ai.defineFlow(
  {
    name: 'listAnalysesFlow',
    inputSchema: ListAnalysesInputSchema,
    outputSchema: ListAnalysesOutputSchema,
  },
  async (input) => {
    try {
      const analysesSnapshot = await firestore
        .collection('analyses')
        .where('userId', '==', input.userId)
        .orderBy('createdAt', 'desc')
        .select('analysisName', 'createdAt') // Select only specific fields
        .get();

      if (analysesSnapshot.empty) {
        return [];
      }

      const reports: ListAnalysesOutput = analysesSnapshot.docs.map(doc => {
        const data = doc.data();
        // Firestore Timestamp to JavaScript Date, then to readable string
        const date = data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString() : 'Date not available';
        
        return {
          id: doc.id,
          name: data.analysisName || 'Untitled Report',
          date: date,
        };
      });

      return reports;

    } catch (error: any) {
      console.error('Error listing analyses from Firestore:', error);
      // In a real app, you might want more specific error types or logging.
      throw new Error(`Failed to list analyses: ${error.message}`);
    }
  }
);
