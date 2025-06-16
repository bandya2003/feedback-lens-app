
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertCircle, FileText, PlusCircle, Columns } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { listAnalyses, type ListAnalysesOutputItem } from '@/ai/flows/list-analyses-flow';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { getClientUserId } from '@/lib/client-user-id'; // Import the new utility

export default function HistoryPage() {
  const [reports, setReports] = useState<ListAnalysesOutputItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const [isCompareModeActive, setIsCompareModeActive] = useState(false);
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    // Ensure getClientUserId is called client-side
    const id = getClientUserId();
    if (id) {
      setCurrentUserId(id);
    } else {
      // Handle case where ID couldn't be generated
      console.warn("Could not retrieve client user ID for history page.");
      setError("Could not establish a user session to load history.");
      setLoading(false);
      toast({
        title: "User ID Issue",
        description: "Could not establish a user session. Unable to load report history.",
        variant: "destructive",
        duration: 5000,
      });
    }
  }, [toast]);

  useEffect(() => {
    async function fetchHistory() {
      if (!currentUserId) {
        // Don't attempt to fetch if userId is not set
        // setError might have been set by the previous useEffect
        if (!error) setError("User session not available to load history.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const result = await listAnalyses({ userId: currentUserId });
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

    if (currentUserId) { // Only fetch history if currentUserId is available
        fetchHistory();
    }
  }, [currentUserId, toast, error]); // Add error to dependency array to avoid re-fetching if error already set

  const handleCompareModeToggle = (checked: boolean) => {
    setIsCompareModeActive(checked);
    if (!checked) {
      setSelectedReports([]); // Clear selections when exiting compare mode
    }
  };

  const handleReportSelect = (reportId: string) => {
    setSelectedReports(prevSelected => {
      const isCurrentlySelected = prevSelected.includes(reportId);
      if (isCurrentlySelected) {
        return prevSelected.filter(id => id !== reportId);
      } else {
        if (prevSelected.length < 2) {
          return [...prevSelected, reportId];
        }
        toast({
            title: "Selection Limit Reached",
            description: "You can only select up to two reports to compare.",
            variant: "default",
            duration: 3000,
        });
        return prevSelected; 
      }
    });
  };


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-6" />
        <h2 className="text-2xl font-headline mb-2 text-foreground">Loading Report History...</h2>
        <p className="text-muted-foreground">Please wait while we fetch your saved analyses.</p>
      </div>
    );
  }

  if (error && !loading) { // Ensure loading is false before showing error to prevent flash of loading then error
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center">
        <AlertCircle className="h-16 w-16 text-destructive mb-6" />
        <h2 className="text-2xl font-headline mb-2 text-destructive">Error Loading History</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => {
            const id = getClientUserId(); // Attempt to re-fetch/re-initialize
            if (id) setCurrentUserId(id);
            setError(null); // Clear error to allow re-fetch attempt
            setLoading(true); // Set loading to true to trigger fetch
        }}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6 text-center">
        <h1 className="text-4xl font-bold font-headline text-primary">Analysis Report History</h1>
        <p className="text-lg text-muted-foreground mt-2">
          Review your previously saved feedback analyses.
        </p>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-4 p-4 border rounded-lg bg-card shadow">
        <div className="flex items-center space-x-2">
          <Switch
            id="compare-mode-toggle"
            checked={isCompareModeActive}
            onCheckedChange={handleCompareModeToggle}
            aria-label="Toggle compare mode"
            className="data-[state=unchecked]:bg-transparent data-[state=unchecked]:border-input-border"
          />
          <Label htmlFor="compare-mode-toggle" className="font-medium text-foreground">
            Enable Compare Mode {isCompareModeActive && `(${selectedReports.length}/2 selected)`}
          </Label>
        </div>
        {isCompareModeActive && selectedReports.length === 2 && (
          <Button asChild size="sm">
            <Link href={`/compare/${selectedReports[0]}/vs/${selectedReports[1]}`}>
              <Columns className="mr-2 h-4 w-4" />
              Compare Selected Reports
            </Link>
          </Button>
        )}
      </div>

      {reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-6 border-2 border-dashed border-border rounded-lg">
          <FileText className="h-20 w-20 text-muted-foreground mb-6" />
          <h2 className="text-2xl font-headline mb-3 text-foreground">No Saved Reports Yet</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            It looks like you haven't saved any analysis reports for this session. Perform an analysis and save it to see it here.
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
          {reports.map((report) => {
            const isSelected = selectedReports.includes(report.id);
            const canSelectMore = selectedReports.length < 2;
            const isDisabled = isCompareModeActive && !isSelected && !canSelectMore;

            return (
              <Card 
                key={report.id} 
                className={cn(
                  "shadow-lg hover:shadow-xl transition-all duration-300 relative",
                  isCompareModeActive && "cursor-pointer",
                  isSelected && "ring-2 ring-primary border-primary",
                  isDisabled && "opacity-60 cursor-not-allowed"
                )}
                onClick={() => {
                  if (isCompareModeActive && !isDisabled) {
                    handleReportSelect(report.id);
                  }
                }}
              >
                {isCompareModeActive && (
                  <div className="absolute top-3 right-3 z-10">
                    <Checkbox
                      id={`select-report-${report.id}`}
                      checked={isSelected}
                      onCheckedChange={() => handleReportSelect(report.id)}
                      disabled={isDisabled}
                      aria-label={`Select report ${report.name}`}
                      className={cn(
                        "h-5 w-5 bg-background border-2",
                        isSelected ? "border-primary text-primary" : "border-muted-foreground"
                      )}
                    />
                  </div>
                )}
                <CardHeader className={cn(isCompareModeActive && "pr-10")}> 
                  <CardTitle className="font-headline text-xl truncate" title={report.name}>
                    {report.name}
                  </CardTitle>
                  <CardDescription>Saved on: {report.date}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Report ID: {report.id.substring(0,8)}...</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
