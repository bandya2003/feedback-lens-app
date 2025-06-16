
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, FileText, ArrowLeft, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { getAnalysisReport, type GetAnalysisReportOutput } from '@/ai/flows/get-analysis-report-flow';
import { DeltaKPICard } from '@/components/feedback-lens/DeltaKPICard';
import type { FeedbackItem, SentimentDataPoint, FeedbackSentimentLabel } from '@/types/feedback';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

type ReportFetchResult = GetAnalysisReportOutput;

// Helper to calculate total sentiments
const calculateSentimentTotals = (items: FeedbackItem[]): { positive: number; negative: number; neutral: number } => {
  return items.reduce(
    (acc, item) => {
      if (item.sentiment === 'positive') acc.positive++;
      else if (item.sentiment === 'negative') acc.negative++;
      else if (item.sentiment === 'neutral') acc.neutral++;
      return acc;
    },
    { positive: 0, negative: 0, neutral: 0 }
  );
};

const chartConfigBase = {
  currentPositive: { label: 'Current Positive', color: 'hsl(var(--chart-1))' },
  currentNegative: { label: 'Current Negative', color: 'hsl(var(--destructive))' },
  previousPositive: { label: 'Previous Positive', color: 'hsl(var(--chart-2))' }, // Using chart-2 for previous positive
  previousNegative: { label: 'Previous Negative', color: 'hsl(var(--chart-4))' }, // Using chart-4 for previous negative
};


export default function CompareReportsPage() {
  const params = useParams();
  const { reportId1, reportId2 } = params as { reportId1: string; reportId2: string };
  const { toast } = useToast();

  const [currentReport, setCurrentReport] = useState<ReportFetchResult>(null);
  const [previousReport, setPreviousReport] = useState<ReportFetchResult>(null);
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

        if (!res1 || !res1.processedData || !res1.analysisDetails) {
          throw new Error(`Report with ID ${reportId1} not found or has incomplete data.`);
        }
        if (!res2 || !res2.processedData || !res2.analysisDetails) {
          throw new Error(`Report with ID ${reportId2} not found or has incomplete data.`);
        }
        
        // Determine which report is newer (current) and older (previous)
        const date1 = new Date(res1.analysisDetails.createdAt);
        const date2 = new Date(res2.analysisDetails.createdAt);

        if (date1 > date2) {
          setCurrentReport(res1);
          setPreviousReport(res2);
        } else {
          setCurrentReport(res2);
          setPreviousReport(res1);
        }

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

  const combinedSentimentChartData = useMemo(() => {
    if (!currentReport?.processedData?.sentimentOverTime || !previousReport?.processedData?.sentimentOverTime) {
      return [];
    }

    const allDates = new Set<string>();
    currentReport.processedData.sentimentOverTime.forEach(dp => allDates.add(dp.date));
    previousReport.processedData.sentimentOverTime.forEach(dp => allDates.add(dp.date));
    
    const sortedDates = Array.from(allDates).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    return sortedDates.map(date => {
      const currentDP = currentReport.processedData.sentimentOverTime.find(dp => dp.date === date);
      const previousDP = previousReport.processedData.sentimentOverTime.find(dp => dp.date === date);
      return {
        date,
        currentPositive: currentDP?.positive ?? 0,
        currentNegative: currentDP?.negative ?? 0,
        currentNeutral: currentDP?.neutral ?? 0,
        previousPositive: previousDP?.positive ?? 0,
        previousNegative: previousDP?.negative ?? 0,
        previousNeutral: previousDP?.neutral ?? 0,
      };
    });
  }, [currentReport, previousReport]);


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center p-4">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-6" />
        <h2 className="text-2xl font-headline mb-2 text-foreground">Loading Report Comparison...</h2>
        <p className="text-muted-foreground">Fetching and preparing data for comparison.</p>
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
          <Link href="/history"><ArrowLeft className="mr-2 h-4 w-4" />Back to History</Link>
        </Button>
      </div>
    );
  }

  if (!currentReport || !previousReport) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center p-4">
        <FileText className="h-16 w-16 text-muted-foreground mb-6" />
        <h2 className="text-2xl font-headline mb-2 text-foreground">Report Data Missing</h2>
        <p className="text-muted-foreground mb-4">One or both reports could not be fully loaded for comparison.</p>
        <Button asChild variant="outline">
          <Link href="/history"><ArrowLeft className="mr-2 h-4 w-4" />Back to History</Link>
        </Button>
      </div>
    );
  }

  const currentTotals = calculateSentimentTotals(currentReport.processedData.feedbackItems);
  const previousTotals = calculateSentimentTotals(previousReport.processedData.feedbackItems);
  
  const currentReportName = currentReport.analysisDetails.name || `Report ${currentReport.analysisDetails.id.substring(0,6)}`;
  const previousReportName = previousReport.analysisDetails.name || `Report ${previousReport.analysisDetails.id.substring(0,6)}`;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold font-headline text-primary">Compare Analyses</h1>
          <p className="text-base sm:text-lg text-muted-foreground mt-1 max-w-xl">
            Comparing <span className="font-semibold text-foreground">'{currentReportName}'</span> (Current) vs <span className="font-semibold text-foreground">'{previousReportName}'</span> (Previous)
          </p>
           <p className="text-xs text-muted-foreground mt-1">
            Current: {new Date(currentReport.analysisDetails.createdAt).toLocaleDateString()} | Previous: {new Date(previousReport.analysisDetails.createdAt).toLocaleDateString()}
          </p>
        </div>
        <Button asChild variant="outline" className="self-start sm:self-center">
          <Link href="/history"><ArrowLeft className="mr-2 h-4 w-4" />Back to History</Link>
        </Button>
      </div>

      {/* Delta KPI Cards */}
      <Card className="mb-8 shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl">Key Metric Changes</CardTitle>
          <CardDescription>Comparison of total sentiment counts between the two reports.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <DeltaKPICard
            metricName="Total Positive"
            currentValue={currentTotals.positive}
            previousValue={previousTotals.positive}
            positiveIsGood={true}
          />
          <DeltaKPICard
            metricName="Total Negative"
            currentValue={currentTotals.negative}
            previousValue={previousTotals.negative}
            positiveIsGood={false} // A decrease in negatives is good
          />
          <DeltaKPICard
            metricName="Total Neutral"
            currentValue={currentTotals.neutral}
            previousValue={previousTotals.neutral}
             // Neutral changes don't typically have a strong good/bad connotation for color
          />
        </CardContent>
      </Card>
      
      {/* Overlaid Sentiment Line Chart */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center">
            <TrendingUp className="mr-2 h-6 w-6 text-primary" />
            Combined Sentiment Trends
          </CardTitle>
          <CardDescription>
            Overlay of positive and negative sentiment trends from both reports. Solid lines are current, dashed are previous.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {combinedSentimentChartData.length > 0 ? (
            <ChartContainer config={chartConfigBase} className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={combinedSentimentChartData} margin={{ top: 5, right: 30, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    tickLine={false} 
                    axisLine={false} 
                    tickMargin={8} 
                    tickFormatter={(value) => value}
                    angle={combinedSentimentChartData.length > 7 ? -30 : 0}
                    textAnchor={combinedSentimentChartData.length > 7 ? "end" : "middle"}
                    height={combinedSentimentChartData.length > 7 ? 50 : 30}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} stroke="hsl(var(--muted-foreground))" />
                  <RechartsTooltip content={<ChartTooltipContent indicator="line" />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  
                  {/* Current Report Lines (Solid) */}
                  <Line dataKey="currentPositive" name="Current Positive" type="monotone" strokeWidth={2} stroke="var(--color-currentPositive)" dot={false} activeDot={{ r: 6 }} />
                  <Line dataKey="currentNegative" name="Current Negative" type="monotone" strokeWidth={2} stroke="var(--color-currentNegative)" dot={false} activeDot={{ r: 6 }} />
                  
                  {/* Previous Report Lines (Dashed) */}
                  <Line dataKey="previousPositive" name="Previous Positive" type="monotone" strokeWidth={2} stroke="var(--color-previousPositive)" strokeDasharray="5 5" dot={false} activeDot={{ r: 6 }} />
                  <Line dataKey="previousNegative" name="Previous Negative" type="monotone" strokeWidth={2} stroke="var(--color-previousNegative)" strokeDasharray="5 5" dot={false} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center">
              <p className="text-muted-foreground text-center">
                Not enough time-series data in one or both reports to display combined trends.
                <br />Ensure reports have timestamped feedback.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
