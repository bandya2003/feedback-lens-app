
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { FileUpload } from '@/components/feedback-lens/FileUpload';
import { ColumnSelector } from '@/components/feedback-lens/ColumnSelector';
import { Dashboard } from '@/components/feedback-lens/Dashboard';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, Sparkles, FileUp, Brain, BarChart3 } from 'lucide-react';
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
  TopicSentimentDistribution
} from '@/types/feedback';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';

// Basic CSV parser (Consider using a library for robustness)
function parseCSV(text: string): { headers: string[]; rows: RawFeedbackItem[] } {
  const lines = text.trim().split('\n');
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  
  const rows = lines.slice(1).map(line => {
    // Improved CSV parsing to handle commas within quoted fields
    const values = [];
    let inQuotes = false;
    let currentValue = '';
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
        if (i + 1 < line.length && line[i+1] === '"') { // Handle escaped quotes ""
          currentValue += '"';
          i++; 
        }
      } else if (char === ',' && !inQuotes) {
        values.push(currentValue.trim().replace(/^"|"$/g, ''));
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim().replace(/^"|"$/g, '')); // Add the last value

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
    setProcessedData(null);
    setActiveTopicFilter(null);
    setCurrentStage('analyzing'); 
    setAnalysisProgress(5); 
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
          } catch (e: any) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            const isRateLimitError = errorMessage.includes("429 Too Many Requests") || errorMessage.includes("Quota");

            if (isRateLimitError) {
                console.warn(`Sentiment analysis for item ${index+1} limited by API rate limits:`, errorMessage);
            } else {
                console.error(`Sentiment analysis failed for item ${index+1}:`, errorMessage, e);
            }

            const userFriendlyMessage = isRateLimitError
              ? `Sentiment analysis for item ${index+1} failed due to API rate limits. Its sentiment might be missing.`
              : `Sentiment analysis for item ${index+1} failed: ${errorMessage.substring(0,100)}. Check console.`;
            toast({
              title: "Sentiment Analysis Limited",
              description: userFriendlyMessage,
              variant: "destructive"
            });
          }
          try {
             topicsResult = await extractFeedbackTopics({ feedbackText });
          } catch (e: any) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            const isRateLimitError = errorMessage.includes("429 Too Many Requests") || errorMessage.includes("Quota");

            if (isRateLimitError) {
              console.warn(`Topic extraction for item ${index+1} limited by API rate limits:`, errorMessage);
            } else {
              console.error(`Topic extraction failed for item ${index+1}:`, errorMessage, e);
            }
            
            const userFriendlyMessage = isRateLimitError
              ? `Topic extraction for item ${index+1} failed due to API rate limits. Its topics might be missing.`
              : `Topic extraction for item ${index+1} failed: ${errorMessage.substring(0,100)}. Check console.`;
            toast({
              title: "Topic Extraction Limited",
              description: userFriendlyMessage,
              variant: "destructive"
            });
          }

          processedCount++;
          setAnalysisProgress(Math.round((processedCount / totalItems) * 50)); 

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
      
      setAnalysisProgress(50);

      const insightsPayload = analyzedItems
        .filter(item => item.sentiment && item.feedbackText)
        .map(item => ({ text: item.feedbackText, sentiment: item.sentiment! }));

      let keyInsightsData: ProcessedFeedbackData['keyInsights'] = null;
      if (insightsPayload.length > 0) {
        try {
          keyInsightsData = await surfaceUrgentIssues({ feedbackData: JSON.stringify(insightsPayload) });
        } catch (e: any) {
           const errorMessage = e instanceof Error ? e.message : String(e);
           const isRateLimitError = errorMessage.includes("429 Too Many Requests") || errorMessage.includes("Quota");

           if (isRateLimitError) {
             console.warn("Key insight generation limited by API rate limits:", errorMessage);
           } else {
             console.error("Surface urgent issues failed:", errorMessage, e);
           }

           const userFriendlyMessage = isRateLimitError
            ? "Could not generate key insights due to API rate limits. Some insights might be unavailable."
            : `Could not generate key insights: ${errorMessage.substring(0,100)}. Check console for details.`;
          toast({ 
            title: "Key Insight Generation Limited", 
            description: userFriendlyMessage, 
            variant: "destructive" 
          });
        }
      }
      setAnalysisProgress(70);

      const sentimentCountsByDate: Record<string, { positive: number; negative: number; neutral: number }> = {};
      analyzedItems.forEach(item => {
        if (item.timestamp && item.sentiment) {
          const dateStr = item.timestamp.toISOString().split('T')[0];
          if (!sentimentCountsByDate[dateStr]) {
            sentimentCountsByDate[dateStr] = { positive: 0, negative: 0, neutral: 0 };
          }
          sentimentCountsByDate[dateStr][item.sentiment]++;
        } else if (item.sentiment) {
           const overallDateKey = 'Overall'; 
           if (!sentimentCountsByDate[overallDateKey]) {
            sentimentCountsByDate[overallDateKey] = { positive: 0, negative: 0, neutral: 0 };
          }
          sentimentCountsByDate[overallDateKey][item.sentiment]++;
        }
      });
      
      let initialSentimentOverTimeData: SentimentDataPoint[];
      const dateKeys = Object.keys(sentimentCountsByDate);
      const hasOnlyOverall = dateKeys.length === 1 && dateKeys[0] === 'Overall';
      const hasDateSpecificData = dateKeys.some(key => key !== 'Overall');

      if (hasOnlyOverall || !hasDateSpecificData && dateKeys.length > 0) {
         initialSentimentOverTimeData = dateKeys.map(date => ({ date, ...sentimentCountsByDate[date] }));
      } else {
        initialSentimentOverTimeData = Object.entries(sentimentCountsByDate)
          .filter(([date]) => date !== 'Overall')
          .map(([date, counts]) => ({ date, ...counts }))
          .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      }
      
      setAnalysisProgress(85);

      const topicSentimentCounts: Record<string, { positive: number; negative: number; neutral: number; total: number; }> = {};
      analyzedItems.forEach(item => {
        item.topics?.forEach(topic => {
          if (!topicSentimentCounts[topic]) {
            topicSentimentCounts[topic] = { positive: 0, negative: 0, neutral: 0, total: 0 };
          }
          if (item.sentiment) {
            topicSentimentCounts[topic][item.sentiment]++;
          }
          topicSentimentCounts[topic].total++;
        });
      });
      const topicDistributionData: TopicSentimentDistribution[] = Object.entries(topicSentimentCounts)
        .map(([name, counts]) => ({ name, ...counts }))
        .sort((a, b) => b.total - a.total);

      setProcessedData({
        feedbackItems: analyzedItems,
        sentimentOverTime: initialSentimentOverTimeData, 
        topicDistribution: topicDistributionData,
        keyInsights: keyInsightsData,
      });
      
      setAnalysisProgress(100);
      setCurrentStage('dashboard');
      toast({ title: "Analysis Complete!", description: "Your feedback dashboard is ready.", className: "bg-primary text-primary-foreground" });

    } catch (error: any) {
      console.error("Analysis failed:", error);
      const generalErrorMessage = error instanceof Error ? error.message : String(error);
      setAnalysisError(`Analysis failed: ${generalErrorMessage}`);
      toast({ title: "Analysis Error", description: `Analysis process encountered an error: ${generalErrorMessage.substring(0,150)}`, variant: "destructive" });
      setCurrentStage('map_columns'); 
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
        return (
          <>
            <FileUpload onFileSelect={handleFileSelect} />
            <section className="mt-12 w-full max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold font-headline text-center mb-8 text-primary">How It Works</h2>
              <div className="grid md:grid-cols-3 gap-8">
                <div className="flex flex-col items-center text-center p-6 bg-card rounded-lg shadow-md">
                  <FileUp className="w-12 h-12 text-accent mb-4" />
                  <h3 className="text-xl font-semibold font-headline mb-2 text-foreground">1. Upload CSV</h3>
                  <p className="text-muted-foreground text-sm">Provide your raw customer feedback.</p>
                </div>
                <div className="flex flex-col items-center text-center p-6 bg-card rounded-lg shadow-md">
                  <Brain className="w-12 h-12 text-accent mb-4" />
                  <h3 className="text-xl font-semibold font-headline mb-2 text-foreground">2. AI Analysis</h3>
                  <p className="text-muted-foreground text-sm">Our AI analyzes sentiment, topics, and trends.</p>
                </div>
                <div className="flex flex-col items-center text-center p-6 bg-card rounded-lg shadow-md">
                  <BarChart3 className="w-12 h-12 text-accent mb-4" />
                  <h3 className="text-xl font-semibold font-headline mb-2 text-foreground">3. Visualize Insights</h3>
                  <p className="text-muted-foreground text-sm">Explore your data in an interactive dashboard.</p>
                </div>
              </div>
            </section>
          </>
        );
      case 'map_columns':
        return <ColumnSelector headers={csvHeaders} onAnalyze={handleAnalyze} isAnalyzing={currentStage === 'analyzing'} />;
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
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                <AlertCircle className="h-16 w-16 text-destructive mb-6" />
                <h2 className="text-2xl font-headline mb-2 text-destructive">Error Displaying Dashboard</h2>
                <p className="text-muted-foreground mb-4">No processed data available. Please try analyzing the file again.</p>
                <Button onClick={handleReset}>Start Over</Button>
            </div>
        );
      default:
        return <p>Unknown application state.</p>;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 flex flex-col items-center min-h-screen">
      <header className="w-full flex justify-between items-center mb-8 text-center">
        <div className="flex-1 text-center"> {/* Centering the title */}
          <h1 className="text-5xl font-bold font-headline text-primary flex items-center justify-center">
            <Sparkles className="w-12 h-12 mr-3 text-accent" />
            Feedback Lens
          </h1>
          <p className="text-lg text-muted-foreground mt-2">
            AI-powered insights from your customer feedback.
          </p>
        </div>
        <div className="ml-auto"> {/* Pushes the button to the right */}
          <ThemeToggleButton />
        </div>
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
        {(currentStage === 'dashboard' || (currentStage === 'map_columns' && csvRows.length > 0) || currentStage === 'upload') && (
          <div className="mt-8 text-center">
            <Button variant="outline" onClick={handleReset} disabled={currentStage === 'upload' && !file}>
              {currentStage === 'upload' && !file ? 'Start by Uploading a File' : 'Analyze Another File'}
            </Button>
          </div>
        )}
      </main>
      <footer className="w-full text-center mt-auto py-6">
        <div className="flex justify-center items-center space-x-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Feedback Lens. Powered by AI.
          </p>
        </div>
      </footer>
    </div>
  );
}

