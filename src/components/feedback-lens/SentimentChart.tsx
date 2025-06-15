import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import type { SentimentDataPoint } from '@/types/feedback';
import { TrendingUp } from 'lucide-react';

interface SentimentChartProps {
  data: SentimentDataPoint[];
}

const chartConfig = {
  positive: {
    label: 'Positive',
    color: 'hsl(var(--chart-2))', // Using accent for positive
  },
  negative: {
    label: 'Negative',
    color: 'hsl(var(--destructive))',
  },
  neutral: {
    label: 'Neutral',
    color: 'hsl(var(--muted-foreground))',
  },
};

export function SentimentChart({ data }: SentimentChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center">
            <TrendingUp className="mr-2 h-6 w-6 text-primary" />
            Sentiment Over Time
          </CardTitle>
          <CardDescription>No data available for sentiment trends.</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">Upload data to see sentiment trends.</p>
        </CardContent>
      </Card>
    );
  }
  
  const hasTimeSeries = data.some(d => d.date !== 'Overall');

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline flex items-center">
           <TrendingUp className="mr-2 h-6 w-6 text-primary" />
           Sentiment {hasTimeSeries ? "Over Time" : "Distribution"}
        </CardTitle>
        <CardDescription>
          {hasTimeSeries ? "Trends of positive, negative, and neutral feedback." : "Overall distribution of sentiment."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                tickLine={false} 
                axisLine={false} 
                tickMargin={8} 
                tickFormatter={(value) => value}
                angle={hasTimeSeries && data.length > 7 ? -30 : 0}
                textAnchor={hasTimeSeries && data.length > 7 ? "end" : "middle"}
                height={hasTimeSeries && data.length > 7 ? 50 : 30}
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
      </CardContent>
    </Card>
  );
}
