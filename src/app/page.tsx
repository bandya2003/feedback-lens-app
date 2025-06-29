
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { FileUpload } from '@/components/feedback-lens/FileUpload';
import { ColumnSelector } from '@/components/feedback-lens/ColumnSelector';
import { Dashboard } from '@/components/feedback-lens/Dashboard';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle, FileUp, Brain, BarChart3, Save } from 'lucide-react'; 
import { useToast } from '@/hooks/use-toast';
import { analyzeFeedbackBatch, AnalyzeFeedbackBatchInput, AnalyzeFeedbackBatchOutput } from '@/ai/flows/analyze-feedback-batch';
import { surfaceUrgentIssues } from '@/ai/flows/surface-urgent-issues';
import { saveAnalysis, SaveAnalysisInput, ProcessedFeedbackDataForSave } from '@/ai/flows/save-analysis-flow.ts'; 
import { getClientUserId } from '@/lib/client-user-id'; // Import the new utility
import type {
  RawFeedbackItem,
  FeedbackItem,
  ProcessedFeedbackData,
  ColumnMapping,
  SentimentDataPoint,
  TopicSentimentDistribution
} from '@/types/feedback';


// Basic CSV parser
function parseCSV(text: string): { headers: string[]; rows: RawFeedbackItem[] } {
  const lines = text.trim().split('\n');
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  
  const rows = lines.slice(1).map(line => {
    const values = [];
    let inQuotes = false;
    let currentValue = '';
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
        if (i + 1 < line.length && line[i+1] === '"') { 
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
    values.push(currentValue.trim().replace(/^"|"$/g, '')); 

    const row: RawFeedbackItem = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    return row;
  });
  return { headers, rows };
}

const BATCH_SIZE = 15;

export default function HomePage() {
  const [currentStage, setCurrentStage] = useState<'upload' | 'map_columns' | 'analyzing' | 'dashboard'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<RawFeedbackItem[]>([]);
  
  const [processedData, setProcessedData] = useState<ProcessedFeedbackData | null>(null);
  const [activeTopicFilter, setActiveTopicFilter] = useState<string | null>(null);
  
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [currentAnalysisName, setCurrentAnalysisName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    // Ensure getClientUserId is called client-side
    const id = getClientUserId();
    if (id) {
      setCurrentUserId(id);
    } else {
      // Handle case where ID couldn't be generated (e.g., SSR or no localStorage)
      // For a prototype, we might disable saving or show a warning.
      console.warn("Could not retrieve client user ID. Saving reports might not work as expected.");
      toast({
        title: "User ID Issue",
        description: "Could not establish a user session. Saved reports might not be linked to you.",
        variant: "destructive",
        duration: 5000,
      });
    }
  }, [toast]);


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
    if (!csvRows.length || !mapping.feedbackTextColumn || !file) return;

    setCurrentStage('analyzing');
    setAnalysisProgress(0);
    setAnalysisError(null);
    setActiveTopicFilter(null);
    setCurrentAnalysisName(file.name.replace(/\.csv$/i, '') + ' Analysis');


    const totalItems = csvRows.length;
    let successfullyProcessedItemsCount = 0;
    const allAnalyzedData: FeedbackItem[] = [];

    const itemsToProcess: Array<AnalyzeFeedbackBatchInput[number] & { originalIndex: number, timestamp?: Date, fullData: RawFeedbackItem }> = csvRows.map((rawItem, index) => {
      const feedbackText = rawItem[mapping.feedbackTextColumn] || '';
      let timestamp: Date | undefined = undefined;
      if (mapping.timestampColumn && rawItem[mapping.timestampColumn]) {
        const tsValue = Date.parse(rawItem[mapping.timestampColumn]);
        if (!isNaN(tsValue)) {
          timestamp = new Date(tsValue);
        }
      }
      return {
        id: `fb-${index}-${Date.now()}`, 
        feedbackText,
        originalIndex: index,
        timestamp,
        fullData: rawItem,
      };
    });

    try {
      const totalBatchCount = Math.ceil(itemsToProcess.length / BATCH_SIZE);
      for (let i = 0; i < itemsToProcess.length; i += BATCH_SIZE) {
        const currentBatchNumber = Math.floor(i / BATCH_SIZE) + 1;
        const batchToProcess = itemsToProcess.slice(i, i + BATCH_SIZE);
        const batchInputItems: AnalyzeFeedbackBatchInput = batchToProcess.map(item => ({
          id: item.id,
          feedbackText: item.feedbackText
        }));
        
        if (batchInputItems.length === 0) continue;

        try {
          const batchResults: AnalyzeFeedbackBatchOutput = await analyzeFeedbackBatch(batchInputItems);
          
          const resultsMap = new Map(batchResults.map(res => [res.id, res]));

          batchToProcess.forEach(originalItemInBatch => {
              const aiResult = resultsMap.get(originalItemInBatch.id);
              allAnalyzedData.push({
                id: originalItemInBatch.id,
                originalIndex: originalItemInBatch.originalIndex,
                fullData: originalItemInBatch.fullData,
                feedbackText: originalItemInBatch.feedbackText,
                timestamp: originalItemInBatch.timestamp, // This is a Date object or undefined
                sentiment: aiResult?.sentiment, 
                sentimentScore: aiResult?.sentiment ? (aiResult.sentiment === 'positive' ? 1 : aiResult.sentiment === 'negative' ? -1 : 0) : undefined, 
                topics: aiResult?.topics, 
              });
              if (aiResult) successfullyProcessedItemsCount++;
          });

        } catch (batchError: any) {
          const errorMessage = batchError instanceof Error ? batchError.message : String(batchError);
          const isApiLimitOrUnavailableError = 
            errorMessage.includes("429") || 
            errorMessage.includes("Quota") ||
            errorMessage.includes("503") ||
            errorMessage.toLowerCase().includes("service unavailable") ||
            errorMessage.toLowerCase().includes("model is overloaded");
          
          let toastMessage;
          if (isApiLimitOrUnavailableError) {
            toastMessage = `Analysis for Batch ${currentBatchNumber} of ${totalBatchCount} failed due to API limits or service unavailability. Some results may be missing.`;
          } else {
            toastMessage = `Analysis for Batch ${currentBatchNumber} of ${totalBatchCount} failed: ${errorMessage.substring(0, 100)}. Check console.`;
          }
          
          toast({
            title: `Batch ${currentBatchNumber} Analysis Error`,
            description: toastMessage,
            variant: "destructive"
          });

          if (isApiLimitOrUnavailableError) console.warn(`Batch ${currentBatchNumber} analysis error:`, errorMessage);
          else console.error(`Batch ${currentBatchNumber} analysis error:`, errorMessage, batchError);
        }
        setAnalysisProgress(Math.round(((i + batchInputItems.length) / totalItems) * 70)); 
      }
      
      setAnalysisProgress(70);

      const insightsPayload = allAnalyzedData
        .filter(item => item.sentiment && item.feedbackText) 
        .map(item => ({ text: item.feedbackText, sentiment: item.sentiment! }));

      let keyInsightsData: ProcessedFeedbackData['keyInsights'] = null;
      if (insightsPayload.length > 0) {
        try {
          keyInsightsData = await surfaceUrgentIssues({ feedbackData: JSON.stringify(insightsPayload) });
        } catch (e: any) {
           const errorMessage = e instanceof Error ? e.message : String(e);
           const isApiLimitOrUnavailableErrorInsights = 
             errorMessage.includes("429") || 
             errorMessage.includes("Quota") ||
             errorMessage.includes("503") ||
             errorMessage.toLowerCase().includes("service unavailable") ||
             errorMessage.toLowerCase().includes("model is overloaded");

           const userFriendlyMessage = isApiLimitOrUnavailableErrorInsights
            ? "Could not generate key insights due to API limits or service unavailability. Some insights might be unavailable."
            : `Could not generate key insights: ${errorMessage.substring(0,100)}. Check console for details.`;
          
           toast({ 
            title: "Key Insight Generation Limited", 
            description: userFriendlyMessage, 
            variant: "destructive" 
          });
           if (isApiLimitOrUnavailableErrorInsights) console.warn("Key insight generation limited by API limits/unavailability:", errorMessage);
           else console.error("Surface urgent issues failed:", errorMessage, e);
        }
      }
      setAnalysisProgress(85); 

      const sentimentCountsByDate: Record<string, { positive: number; negative: number; neutral: number }> = {};
      allAnalyzedData.forEach(item => {
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
      
      setAnalysisProgress(95); 

      const topicSentimentCounts: Record<string, { positive: number; negative: number; neutral: number; total: number; }> = {};
      allAnalyzedData.forEach(item => {
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
        feedbackItems: allAnalyzedData,
        sentimentOverTime: initialSentimentOverTimeData, 
        topicDistribution: topicDistributionData,
        keyInsights: keyInsightsData,
      });
      
      setAnalysisProgress(100);
      setCurrentStage('dashboard');
      toast({ 
        title: "Analysis Complete!", 
        description: `${successfullyProcessedItemsCount} of ${totalItems} items fully analyzed. Your feedback dashboard is ready.`, 
        className: "bg-primary text-primary-foreground" 
      });

    } catch (error: any) { 
      console.error("Overall analysis failed:", error);
      const generalErrorMessage = error instanceof Error ? error.message : String(error);
      setAnalysisError(`Analysis failed: ${generalErrorMessage}`);
      toast({ title: "Analysis Error", description: `Analysis process encountered an error: ${generalErrorMessage.substring(0,150)}`, variant: "destructive" });
      setCurrentStage('map_columns'); 
      setAnalysisProgress(0);
    }
  }, [csvRows, toast, file]);

  const handleSaveAnalysisConfirmed = async () => {
    if (!processedData || !file || !currentAnalysisName.trim()) {
      toast({
        title: "Cannot Save Report",
        description: "Missing data or report name. Please ensure analysis is complete and a name is provided.",
        variant: "destructive",
      });
      return;
    }

    if (!currentUserId) {
      toast({
        title: "Cannot Save Report",
        description: "User session ID is missing. Please refresh the page and try again.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Convert Date objects in feedbackItems to ISO strings before saving
      const processedDataForSave: ProcessedFeedbackDataForSave = {
        ...processedData,
        feedbackItems: processedData.feedbackItems.map(item => ({
          ...item,
          timestamp: item.timestamp instanceof Date ? item.timestamp.toISOString() : undefined,
        })),
      };

      const input: SaveAnalysisInput = {
        userId: currentUserId, // Use the dynamic userId
        analysisName: currentAnalysisName.trim(),
        sourceFileName: file.name,
        processedData: processedDataForSave,
      };
      const result = await saveAnalysis(input);
      toast({
        title: "Report Saved!",
        description: `${result.message} (ID: ${result.analysisId.substring(0,6)}...)`,
        className: "bg-primary text-primary-foreground"
      });
      setIsSaveDialogOpen(false);
    } catch (error: any) {
      console.error("Error saving analysis:", error);
      toast({
        title: "Save Failed",
        description: `Could not save the report: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setCsvHeaders([]);
    setCsvRows([]);
    setProcessedData(null);
    setActiveTopicFilter(null);
    setAnalysisError(null);
    setAnalysisProgress(0);
    setCurrentStage('upload');
    setCurrentAnalysisName('');
    setIsSaveDialogOpen(false);
    setIsSaving(false);
    // Note: currentUserId remains, as it's tied to the browser session
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
            <p className="text-muted-foreground mb-4">Please wait while we process your data in batches. This may take a few moments.</p>
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
      
      <div className="w-full max-w-7xl"> 
        {analysisError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{analysisError}</AlertDescription>
          </Alert>
        )}
        {renderContent()}

        <div className="mt-8 text-center space-x-4">
            {(currentStage === 'dashboard' || (currentStage === 'map_columns' && csvRows.length > 0) || (currentStage === 'upload' && file)) && (
                <Button variant="outline" onClick={handleReset} disabled={currentStage === 'analyzing' || isSaving}>
                  {currentStage === 'upload' && !file ? 'Start by Uploading a File' : 'Analyze Another File'}
                </Button>
            )}

            {currentStage === 'dashboard' && processedData && (
                <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="default" disabled={isSaving || !currentUserId}>
                            <Save className="mr-2 h-4 w-4" />
                            {isSaving ? 'Saving...' : 'Save Current Analysis'}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                        <DialogTitle>Save Analysis Report</DialogTitle>
                        <DialogDescription>
                            Enter a name for this analysis report. This will save the current dashboard view for your session.
                        </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="analysisName" className="text-right">
                            Report Name
                            </Label>
                            <Input
                            id="analysisName"
                            value={currentAnalysisName}
                            onChange={(e) => setCurrentAnalysisName(e.target.value)}
                            className="col-span-3"
                            placeholder="e.g., Q3 Product Feedback"
                            />
                        </div>
                        </div>
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button type="button" variant="outline" disabled={isSaving}>
                                Cancel
                            </Button>
                          </DialogClose>
                          <Button type="button" onClick={handleSaveAnalysisConfirmed} disabled={isSaving || !currentAnalysisName.trim() || !currentUserId}>
                              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                              Save Report
                          </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
      </div>
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
