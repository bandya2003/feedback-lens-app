
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertCircle, FileText, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { listAnalyses, type ListAnalysesOutputItem } from '@/ai/flows/list-analyses-flow'; 

export default function HistoryPage() {
  const [reports, setReports] = useState<ListAnalysesOutputItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true);
      setError(null);
      try {
        // For now, using a hardcoded userId. This will be replaced with actual user auth later.
        const result = await listAnalyses({ userId: "demo_user_01" });
        setReports(result);
      } catch (e: any) {
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
        console.error("Failed to fetch analysis history:", errorMessage, e);
        setError(`Failed to load history: ${errorMessage.substring(0,100)}`);
        toast({
          title: "Error Loading History",
          description: `Could not retrieve saved reports: ${errorMessage.substring(0,100)}`,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [toast]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-6" />
        <h2 className="text-2xl font-headline mb-2 text-foreground">Loading Report History...</h2>
        <p className="text-muted-foreground">Please wait while we fetch your saved analyses.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center">
        <AlertCircle className="h-16 w-16 text-destructive mb-6" />
        <h2 className="text-2xl font-headline mb-2 text-destructive">Error Loading History</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold font-headline text-primary">Analysis Report History</h1>
        <p className="text-lg text-muted-foreground mt-2">
          Review your previously saved feedback analyses.
        </p>
      </div>

      {reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-6 border-2 border-dashed border-border rounded-lg">
          <FileText className="h-20 w-20 text-muted-foreground mb-6" />
          <h2 className="text-2xl font-headline mb-3 text-foreground">No Saved Reports Yet</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            It looks like you haven't saved any analysis reports. Perform an analysis and save it to see it here.
          </p>
          <Button asChild size="lg">
            <Link href="/">
              <PlusCircle className="mr-2 h-5 w-5" />
              Analyze New Feedback
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {reports.map((report) => (
            <Card key={report.id} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="font-headline text-xl truncate" title={report.name}>
                  {report.name}
                </CardTitle>
                <CardDescription>Saved on: {report.date}</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Future: Could add a small summary or stats here */}
                <p className="text-sm text-muted-foreground">Report ID: {report.id.substring(0,8)}...</p>
              </CardContent>
              {/* Future: Add a button to view the full report, e.g., <Button asChild className="w-full mt-2"><Link href={`/dashboard/${report.id}`}>View Report</Link></Button> */}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
