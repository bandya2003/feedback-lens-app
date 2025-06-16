
'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, FileText, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getAnalysisReport, type GetAnalysisReportOutput } from '@/ai/flows/get-analysis-report-flow';
import Link from 'next/link';

// Re-using ProcessedFeedbackDataForSave type from save-analysis-flow via get-analysis-report-flow
type ReportData = GetAnalysisReportOutput; 

export default function CompareReportsPage() {
  const params = useParams();
  const { reportId1, reportId2 } = params as { reportId1: string; reportId2: string };
  const { toast } = useToast();

  const [report1Data, setReport1Data] = useState<ReportData>(null);
  const [report2Data, setReport2Data] = useState<ReportData>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReportData() {
      if (!reportId1 || !reportId2) {
        setError("Report IDs are missing.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const [res1, res2] = await Promise.all([
          getAnalysisReport({ analysisId: reportId1 }),
          getAnalysisReport({ analysisId: reportId2 }),
        ]);

        if (!res1) {
          throw new Error(`Report with ID ${reportId1} not found or has no data.`);
        }
        setReport1Data(res1);

        if (!res2) {
          throw new Error(`Report with ID ${reportId2} not found or has no data.`);
        }
        setReport2Data(res2);

      } catch (e: any) {
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
        console.error("Failed to fetch report data for comparison:", errorMessage, e);
        setError(`Failed to load report data: ${errorMessage.substring(0, 150)}`);
        toast({
          title: "Error Loading Reports",
          description: `Could not retrieve one or both reports: ${errorMessage.substring(0, 100)}`,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchReportData();
  }, [reportId1, reportId2, toast]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center p-4">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-6" />
        <h2 className="text-2xl font-headline mb-2 text-foreground">Loading Report Data...</h2>
        <p className="text-muted-foreground">Please wait while we fetch the details for comparison.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center p-4">
        <AlertCircle className="h-16 w-16 text-destructive mb-6" />
        <h2 className="text-2xl font-headline mb-2 text-destructive">Error Loading Comparison</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button asChild variant="outline">
            <Link href="/history">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to History
            </Link>
        </Button>
      </div>
    );
  }

  if (!report1Data || !report2Data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center p-4">
        <FileText className="h-16 w-16 text-muted-foreground mb-6" />
        <h2 className="text-2xl font-headline mb-2 text-foreground">Report Data Missing</h2>
        <p className="text-muted-foreground mb-4">
          One or both of the selected reports could not be fully loaded.
        </p>
         <Button asChild variant="outline">
            <Link href="/history">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to History
            </Link>
        </Button>
      </div>
    );
  }

  // Find the original names from sourceFileName or analysisName (which now exists on processedData)
  // For now, we assume analysisName is part of the ProcessedFeedbackDataForSave,
  // but save-analysis-flow saves it at the top level of the Firestore doc.
  // We'll adjust if necessary, or pass full doc data to compare page in future.
  // Let's assume for now, we don't have analysisName directly in report1Data/report2Data.
  // We'll just use the IDs for the title for now.
  const report1Name = `Report ${reportId1.substring(0,6)}...`;
  const report2Name = `Report ${reportId2.substring(0,6)}...`;


  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6 flex items-center justify-between">
        <div>
            <h1 className="text-3xl sm:text-4xl font-bold font-headline text-primary">Compare Analyses</h1>
            <p className="text-lg text-muted-foreground mt-1">
                Comparing '{report1Name}' vs '{report2Name}'
            </p>
        </div>
        <Button asChild variant="outline">
            <Link href="/history">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to History
            </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Comparison View</CardTitle>
          <CardDescription>
            Detailed comparison between the two selected reports will be displayed here.
          </CardDescription>
        </CardHeader>
        <CardContent className="min-h-[300px] flex items-center justify-center">
          <p className="text-xl text-muted-foreground">
            Comparison components coming soon!
          </p>
        </CardContent>
      </Card>

      {/* Example: Displaying some raw data for verification (can be removed later) */}
      {/* 
      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <Card>
          <CardHeader><CardTitle>{report1Name}</CardTitle></CardHeader>
          <CardContent><pre className="text-xs overflow-auto max-h-60 bg-muted p-2 rounded">{JSON.stringify(report1Data?.keyInsights, null, 2)}</pre></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{report2Name}</CardTitle></CardHeader>
          <CardContent><pre className="text-xs overflow-auto max-h-60 bg-muted p-2 rounded">{JSON.stringify(report2Data?.keyInsights, null, 2)}</pre></CardContent>
        </Card>
      </div>
      */}
    </div>
  );
}

