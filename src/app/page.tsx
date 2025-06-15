
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { FileUpload } from '@/components/feedback-lens/FileUpload';
import { ColumnSelector } from '@/components/feedback-lens/ColumnSelector';
import { Dashboard } from '@/components/feedback-lens/Dashboard';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { analyzeFeedbackSentiment } from '@/ai/flows/analyze-feedback-sentiment';
import { extractFeedbackTopics } from '@/ai/flows/extract-feedback-topics';
import { surfaceUrgentIssues } from '@/ai/flows/surface-urgent-issues';
import type { 
  RawFeedbackItem, 
  FeedbackItem, 
  ProcessedFeedbackData, 
  ColumnMapping,
  FeedbackSentimentLabel,
  SentimentDataPoint,
  TopicCount
} from '@/types/feedback';

// Basic CSV parser (Consider using a library for robustness)
function parseCSV(text: string): { headers: string[]; rows: RawFeedbackItem[] } {
  const lines = text.trim().split('\n');
  if (lines.length === 0) return { headers: [], rows: [] };

  // Improved header parsing to handle potential quotes and extra spaces
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  
  const rows = lines.slice(1).map(line => {
    // This is still a naive CSV parser. It doesn't handle commas inside quoted fields well.
    // E.g. "field1","field2, with comma","field3"
    // For production, a robust CSV library (like PapaParse) is highly recommended.
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row: RawFeedbackItem = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    return row;
  });
  return { headers, rows };
}


export default function HomePage() {
  const [currentStage, setCurrentStage] = useState<'upload' | 'map_columns' | 'analyzing' | 'dashboard'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<RawFeedbackItem[]>([]);
  
  const [processedData, setProcessedData] = useState<ProcessedFeedbackData | null>(null);
  const [activeTopicFilter, setActiveTopicFilter] = useState<string | null>(null);
  
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const { toast } = useToast();

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setAnalysisError(null);
    setCurrentStage('analyzing'); // Show loader immediately
    setAnalysisProgress(5); // Initial progress
    try {
      const text = await selectedFile.text();
      setAnalysisProgress(10);
      const { headers, rows } = parseCSV(text);
      if (headers.length === 0 || rows.length === 0) {
        throw new Error("CSV file is empty or improperly formatted.");
      }
      setCsvHeaders(headers);
      setCsvRows(rows);
      setCurrentStage('map_columns');
      setAnalysisProgress(0); 
    } catch (error: any) {
      console.error("Error processing CSV:", error);
      setAnalysisError(`Failed to process CSV: ${error.message}`);
      toast({ title: "CSV Error", description: `Failed to process CSV: ${error.message}`, variant: "destructive" });
      setCurrentStage('upload');
      setAnalysisProgress(0);
    }
  }, [toast]);

  const handleAnalyze = useCallback(async (mapping: ColumnMapping) => {
    if (!csvRows.length || !mapping.feedbackTextColumn) return;

    setCurrentStage('analyzing');
    setAnalysisProgress(0);
    setAnalysisError(null);
    setActiveTopicFilter(null);

    const totalItems = csvRows.length;
    let processedCount = 0;

    try {
      const analyzedItems: FeedbackItem[] = await Promise.all(
        csvRows.map(async (rawItem, index): Promise<FeedbackItem> => {
          const feedbackText = rawItem[mapping.feedbackTextColumn] || '';
          let timestamp: Date | undefined = undefined;
          if (mapping.timestampColumn && rawItem[mapping.timestampColumn]) {
            const tsValue = Date.parse(rawItem[mapping.timestampColumn]);
            if (!isNaN(tsValue)) {
              timestamp = new Date(tsValue);
            }
          }

          let sentimentResult, topicsResult;
          try {
             sentimentResult = await analyzeFeedbackSentiment({ feedbackText });
          } catch (e) { console.error("Sentiment analysis failed for item:", index, e); }
          try {
             topicsResult = await extractFeedbackTopics({ feedbackText });
          } catch (e) { console.error("Topic extraction failed for item:", index, e); }


          processedCount++;
          setAnalysisProgress(Math.round((processedCount / (totalItems * 2)) * 100)); // AI calls are roughly half the work

          return {
            id: `fb-${index}-${Date.now()}`,
            originalIndex: index,
            fullData: rawItem,
            feedbackText,
            timestamp,
            sentiment: sentimentResult?.sentiment as FeedbackSentimentLabel | undefined,
            sentimentScore: sentimentResult?.score,
            topics: topicsResult?.topics,
          };
        })
      );
      
      setAnalysisProgress(50); // After individual analyses

      // Prepare data for KeyInsights (surfaceUrgentIssues)
      const insightsPayload = analyzedItems
        .filter(item => item.sentiment && item.feedbackText)
        .map(item => ({ text: item.feedbackText, sentiment: item.sentiment! }));

      let keyInsightsData: ProcessedFeedbackData['keyInsights'] = null;
      if (insightsPayload.length > 0) {
        try {
          keyInsightsData = await surfaceUrgentIssues({ feedbackData: JSON.stringify(insightsPayload) });
        } catch (e) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          console.error("Surface urgent issues failed:", errorMessage, e);
          toast({ 
            title: "Key Insight Generation Failed", 
            description: `Could not generate key insights: ${errorMessage}. This may be due to API rate limits. Further details might be in the browser console.`, 
            variant: "destructive" 
          });
        }
      }
      setAnalysisProgress(70);

      // Prepare SentimentOverTime data
      const sentimentCountsByDate: Record<string, { positive: number; negative: number; neutral: number }> = {};
      let hasTimestamps = false;
      analyzedItems.forEach(item => {
        if (item.timestamp && item.sentiment) {
          hasTimestamps = true;
          const dateStr = item.timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
          if (!sentimentCountsByDate[dateStr]) {
            sentimentCountsByDate[dateStr] = { positive: 0, negative: 0, neutral: 0 };
          }
          sentimentCountsByDate[dateStr][item.sentiment]++;
        } else if (item.sentiment) { // Fallback if no timestamps
           if (!sentimentCountsByDate['Overall']) {
            sentimentCountsByDate['Overall'] = { positive: 0, negative: 0, neutral: 0 };
          }
          sentimentCountsByDate['Overall'][item.sentiment]++;
        }
      });
      
      const sentimentOverTimeData: SentimentDataPoint[] = Object.entries(sentimentCountsByDate)
        .map(([date, counts]) => ({ date, ...counts }))
        .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Sort by date
      
      setAnalysisProgress(85);

      // Prepare TopicDistribution data
      const topicCounts: Record<string, number> = {};
      analyzedItems.forEach(item => {
        item.topics?.forEach(topic => {
          topicCounts[topic] = (topicCounts[topic] || 0) + 1;
        });
      });
      const topicDistributionData: TopicCount[] = Object.entries(topicCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      setProcessedData({
        feedbackItems: analyzedItems,
        sentimentOverTime: sentimentOverTimeData,
        topicDistribution: topicDistributionData,
        keyInsights: keyInsightsData,
      });
      
      setAnalysisProgress(100);
      setCurrentStage('dashboard');
      toast({ title: "Analysis Complete!", description: "Your feedback dashboard is ready.", className: "bg-primary text-primary-foreground" });

    } catch (error: any) {
      console.error("Analysis failed:", error);
      setAnalysisError(`Analysis failed: ${error.message}`);
      toast({ title: "Analysis Error", description: `Analysis failed: ${error.message}`, variant: "destructive" });
      setCurrentStage('map_columns'); // Or 'upload' if more appropriate
      setAnalysisProgress(0);
    }
  }, [csvRows, toast]);

  const handleReset = () => {
    setFile(null);
    setCsvHeaders([]);
    setCsvRows([]);
    setProcessedData(null);
    setActiveTopicFilter(null);
    setAnalysisError(null);
    setAnalysisProgress(0);
    setCurrentStage('upload');
  };
  
  const renderContent = () => {
    switch (currentStage) {
      case 'upload':
        return <FileUpload onFileSelect={handleFileSelect} />;
      case 'map_columns':
        return <ColumnSelector headers={csvHeaders} onAnalyze={handleAnalyze} isAnalyzing={false} />;
      case 'analyzing':
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
            <Loader2 className="h-16 w-16 animate-spin text-primary mb-6" />
            <h2 className="text-2xl font-headline mb-2 text-foreground">Analyzing Feedback...</h2>
            <p className="text-muted-foreground mb-4">Please wait while we process your data. This may take a few moments.</p>
            <Progress value={analysisProgress} className="w-full max-w-md" />
            <p className="text-sm text-muted-foreground mt-2">{analysisProgress}% complete</p>
          </div>
        );
      case 'dashboard':
        if (processedData) {
          return (
            <Dashboard 
              data={processedData} 
              activeTopicFilter={activeTopicFilter} 
              onTopicSelect={setActiveTopicFilter} 
            />
          );
        }
        return <p>Error: No processed data available.</p>; // Should not happen if logic is correct
      default:
        return <p>Unknown application state.</p>;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 flex flex-col items-center min-h-screen">
      <header className="mb-8 text-center">
        <h1 className="text-5xl font-bold font-headline text-primary flex items-center justify-center">
          <Sparkles className="w-12 h-12 mr-3 text-accent" />
          Feedback Lens
        </h1>
        <p className="text-lg text-muted-foreground mt-2">
          AI-powered insights from your customer feedback.
        </p>
      </header>
      
      <main className="w-full max-w-7xl">
        {analysisError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{analysisError}</AlertDescription>
          </Alert>
        )}
        {renderContent()}
        {(currentStage === 'dashboard' || currentStage === 'map_columns' && csvRows.length > 0) && (
          <div className="mt-8 text-center">
            <Button variant="outline" onClick={handleReset}>
              Analyze Another File
            </Button>
          </div>
        )}
      </main>
      <footer className="w-full text-center mt-auto py-6">
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Feedback Lens. Powered by AI.
        </p>
      </footer>
    </div>
  );
}
