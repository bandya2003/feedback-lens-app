import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, TrendingUp, Info } from 'lucide-react';
import type { KeyInsights } from '@/types/feedback';

interface KeyInsightsCardProps {
  insights: KeyInsights | null;
}

export function KeyInsightsCard({ insights }: KeyInsightsCardProps) {
  if (!insights) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center">
            <Info className="mr-2 h-6 w-6 text-primary" />
            Key Insights
          </CardTitle>
          <CardDescription>AI-generated summary of feedback trends.</CardDescription>
        </CardHeader>
        <CardContent className="h-[150px] flex items-center justify-center">
          <p className="text-muted-foreground">Insights will appear here after analysis.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline flex items-center">
            <Info className="mr-2 h-6 w-6 text-primary" />
            Key Insights
        </CardTitle>
        <CardDescription>AI-generated summary of feedback trends.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {insights.urgentIssue && (
          <div className="flex items-start p-3 bg-destructive/10 rounded-lg">
            <AlertTriangle className="h-6 w-6 text-destructive mr-3 mt-1 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-destructive">Urgent Issue</h4>
              <p className="text-sm text-destructive/90">{insights.urgentIssue}</p>
            </div>
          </div>
        )}
        {insights.overallSentiment && (
          <div className="flex items-start p-3 bg-primary/10 rounded-lg">
            <TrendingUp className="h-6 w-6 text-primary mr-3 mt-1 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-primary">Overall Sentiment</h4>
              <p className="text-sm text-primary/90">{insights.overallSentiment}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
