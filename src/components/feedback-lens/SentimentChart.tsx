
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import type { FeedbackItem, SentimentDataPoint, FeedbackSentimentLabel } from '@/types/feedback';
import { TrendingUp, CheckCircle, XCircle, AlertCircle as AlertCircleIcon } from 'lucide-react'; // Renamed AlertCircle to avoid conflict

interface SentimentChartProps {
  feedbackItems: FeedbackItem[];
}

const chartConfig = {
  positive: {
    label: 'Positive',
    color: 'hsl(var(--chart-1))', // Primary Blue
  },
  negative: {
    label: 'Negative',
    color: 'hsl(var(--destructive))', // Destructive Red
  },
  neutral: {
    label: 'Neutral',
    color: 'hsl(var(--muted))', // Muted Gray
  },
};

const KPICard: React.FC<{ title: string; value: number; icon: React.ElementType; colorClass: string }> = ({ title, value, icon: Icon, colorClass }) => (
  <Card className="shadow-md">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className={`h-5 w-5 ${colorClass === 'text-muted-foreground' ? colorClass : colorClass + '/70'}`} />
    </CardHeader>
    <CardContent>
      <div className={`text-3xl font-bold ${colorClass}`}>{value}</div>
    </CardContent>
  </Card>
);

export function SentimentChart({ feedbackItems }: SentimentChartProps) {
  const { sentimentOverTime, totals } = useMemo(() => {
    const sentimentCountsByDate: Record<string, { positive: number; negative: number; neutral: number }> = {};
    let totalPositive = 0;
    let totalNegative = 0;
    let totalNeutral = 0;
    let hasTimestamps = false;

    feedbackItems.forEach(item => {
      if (item.sentiment) {
        if (item.sentiment === 'positive') totalPositive++;
        else if (item.sentiment === 'negative') totalNegative++;
        else totalNeutral++;
      }

      if (item.timestamp && item.sentiment) {
        hasTimestamps = true;
        const dateStr = item.timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
        if (!sentimentCountsByDate[dateStr]) {
          sentimentCountsByDate[dateStr] = { positive: 0, negative: 0, neutral: 0 };
        }
        sentimentCountsByDate[dateStr][item.sentiment as FeedbackSentimentLabel]++;
      } else if (item.sentiment && !hasTimestamps) { // Fallback if no timestamps or mixed
         const overallDateKey = 'Overall';
         if (!sentimentCountsByDate[overallDateKey]) {
          sentimentCountsByDate[overallDateKey] = { positive: 0, negative: 0, neutral: 0 };
        }
        sentimentCountsByDate[overallDateKey][item.sentiment as FeedbackSentimentLabel]++;
      }
    });
    
    // If only 'Overall' exists or no timestamps, use that. Otherwise, sort by date.
    let processedSentimentData: SentimentDataPoint[];
    if (Object.keys(sentimentCountsByDate).length === 1 && sentimentCountsByDate['Overall']) {
        processedSentimentData = [{ date: 'Overall', ...sentimentCountsByDate['Overall'] }];
    } else {
        processedSentimentData = Object.entries(sentimentCountsByDate)
        .filter(([date]) => date !== 'Overall' || !hasTimestamps) // Ensure 'Overall' only used if no other dates
        .map(([date, counts]) => ({ date, ...counts }))
        .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }


    return { 
      sentimentOverTime: processedSentimentData, 
      totals: { positive: totalPositive, negative: totalNegative, neutral: totalNeutral } 
    };
  }, [feedbackItems]);

  const displayTimeSeries = sentimentOverTime.length > 0 && sentimentOverTime.some(d => d.date !== 'Overall');

  if (!feedbackItems || feedbackItems.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center">
            <TrendingUp className="mr-2 h-6 w-6 text-primary" />
            Sentiment Over Time
          </CardTitle>
          <CardDescription>No data available for sentiment trends. KPIs will also be empty.</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">Upload data to see sentiment trends.</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <>
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <KPICard title="Total Positive" value={totals.positive} icon={CheckCircle} colorClass="text-primary" />
        <KPICard title="Total Negative" value={totals.negative} icon={XCircle} colorClass="text-destructive" />
        <KPICard title="Total Neutral" value={totals.neutral} icon={AlertCircleIcon} colorClass="text-muted-foreground" />
      </div>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center">
            <TrendingUp className="mr-2 h-6 w-6 text-primary" />
            Sentiment {displayTimeSeries ? "Over Time" : "Distribution"}
          </CardTitle>
          <CardDescription>
            {displayTimeSeries ? "Trends of positive, negative, and neutral feedback." : "Overall distribution of sentiment."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sentimentOverTime.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sentimentOverTime} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    tickLine={false} 
                    axisLine={false} 
                    tickMargin={8} 
                    tickFormatter={(value) => value}
                    angle={displayTimeSeries && sentimentOverTime.length > 7 ? -30 : 0}
                    textAnchor={displayTimeSeries && sentimentOverTime.length > 7 ? "end" : "middle"}
                    height={displayTimeSeries && sentimentOverTime.length > 7 ? 50 : 30}
                  />
                  <YAxis 
                    tickLine={false} 
                    axisLine={false} 
                    tickMargin={8}
                    allowDecimals={false} 
                  />
                  <ChartTooltip
                    cursor={true}
                    content={<ChartTooltipContent indicator="line" />}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line dataKey="positive" type="monotone" strokeWidth={2} stroke="var(--color-positive)" dot={false} activeDot={{ r: 6 }} />
                  <Line dataKey="negative" type="monotone" strokeWidth={2} stroke="var(--color-negative)" dot={false} activeDot={{ r: 6 }}/>
                  <Line dataKey="neutral" type="monotone" strokeWidth={2} stroke="var(--color-neutral)" dot={false} activeDot={{ r: 6 }}/>
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center">
              <p className="text-muted-foreground">Not enough data to display chart for current filter.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
