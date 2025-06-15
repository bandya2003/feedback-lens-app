
import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { AlertTriangle, TrendingUp, Info, PieChart as PieChartIcon } from 'lucide-react';
import type { FeedbackItem, FeedbackSentimentLabel } from '@/types/feedback';
import { ChartContainer, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';


interface KeyInsightsCardProps {
  feedbackItems: FeedbackItem[];
  urgentIssue?: string | null;
}

const POSITIVE_COLOR = 'hsl(var(--chart-1))'; // Primary Blue
const NEGATIVE_COLOR = 'hsl(var(--destructive))'; // Red
const NEUTRAL_COLOR = 'hsl(var(--muted))'; // Muted Gray

const sentimentColors: Record<FeedbackSentimentLabel, string> = {
  positive: POSITIVE_COLOR,
  negative: NEGATIVE_COLOR,
  neutral: NEUTRAL_COLOR,
};

const chartConfig = {
  positive: { label: 'Positive', color: POSITIVE_COLOR },
  negative: { label: 'Negative', color: NEGATIVE_COLOR },
  neutral: { label: 'Neutral', color: NEUTRAL_COLOR },
};

export function KeyInsightsCard({ feedbackItems, urgentIssue }: KeyInsightsCardProps) {
  const sentimentBreakdown = useMemo(() => {
    let positive = 0;
    let negative = 0;
    let neutral = 0;

    feedbackItems.forEach(item => {
      if (item.sentiment === 'positive') positive++;
      else if (item.sentiment === 'negative') negative++;
      else if (item.sentiment === 'neutral') neutral++;
    });

    const total = positive + negative + neutral;
    if (total === 0) return [];

    return [
      { name: 'Positive', value: positive, fill: sentimentColors.positive },
      { name: 'Negative', value: negative, fill: sentimentColors.negative },
      { name: 'Neutral', value: neutral, fill: sentimentColors.neutral },
    ].filter(s => s.value > 0); // Only include segments with value > 0
  }, [feedbackItems]);


  const noDataForDonut = sentimentBreakdown.length === 0;

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline flex items-center">
            <Info className="mr-2 h-6 w-6 text-primary" />
            Key Insights
        </CardTitle>
        <CardDescription>AI-generated summary and overall sentiment breakdown.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {urgentIssue && (
          <div className="flex items-start p-3 bg-destructive/10 rounded-lg">
            <AlertTriangle className="h-6 w-6 text-destructive mr-3 mt-1 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-destructive">Urgent Issue</h4>
              <p className="text-sm text-destructive/90">{urgentIssue}</p>
            </div>
          </div>
        )}
        {!urgentIssue && feedbackItems.length > 0 && (
            <div className="flex items-start p-3 bg-secondary/20 rounded-lg">
                <TrendingUp className="h-6 w-6 text-secondary-foreground mr-3 mt-1 flex-shrink-0" />
                <div>
                    <h4 className="font-semibold text-secondary-foreground">General Overview</h4>
                    <p className="text-sm text-muted-foreground">No specific urgent issue highlighted by AI. Review overall sentiment.</p>
                </div>
            </div>
        )}
        
        <div>
          <h4 className="font-semibold text-foreground mb-2 flex items-center">
            <PieChartIcon className="mr-2 h-5 w-5 text-primary/80" />
            Overall Sentiment Breakdown
          </h4>
          {noDataForDonut ? (
            <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
              {feedbackItems.length > 0 ? "Not enough sentiment data for chart." : "Analyze data to see sentiment breakdown."}
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel nameKey="name" />}
                  />
                  <Pie
                    data={sentimentBreakdown}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="60%" // Donut effect
                    outerRadius="80%"
                    strokeWidth={2}
                  >
                    {sentimentBreakdown.map((entry) => (
                      <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                    ))}
                  </Pie>
                   <ChartLegend
                    content={<ChartLegendContent nameKey="name" className="text-xs [&_.recharts-legend-item]:flex-col [&_.recharts-legend-item-text]:text-muted-foreground"/>}
                    layout="vertical"
                    verticalAlign="middle"
                    align="right"
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}
        </div>
        {feedbackItems.length === 0 && !urgentIssue && (
            <p className="text-sm text-muted-foreground text-center py-4">Upload and analyze data to generate insights.</p>
        )}
      </CardContent>
    </Card>
  );
}
