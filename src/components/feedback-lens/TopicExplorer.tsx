
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LabelList, Legend, Tooltip as RechartsTooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart'; // ChartLegend might not be directly used for stacked bar's legend
import type { TopicSentimentDistribution } from '@/types/feedback';
import { BarChart3 } from 'lucide-react';

interface TopicExplorerProps {
  data: TopicSentimentDistribution[];
  onTopicSelect: (topic: string | null) => void;
  activeTopic: string | null;
}

// Consistent colors with SentimentChart and KeyInsights Donut
const POSITIVE_COLOR = 'hsl(var(--chart-1))'; // Primary Blue
const NEGATIVE_COLOR = 'hsl(var(--destructive))'; // Red
const NEUTRAL_COLOR = 'hsl(var(--muted))'; // Muted Gray

const chartConfig = {
  positive: { label: 'Positive', color: POSITIVE_COLOR },
  negative: { label: 'Negative', color: NEGATIVE_COLOR },
  neutral: { label: 'Neutral', color: NEUTRAL_COLOR },
};

const CustomTooltipContent = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload; // The data for the hovered bar (topic)
    return (
      <div className="p-2 bg-popover border rounded shadow-lg text-popover-foreground text-xs">
        <p className="font-bold mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={`item-${index}`} style={{ color: entry.color }}>
            {`${entry.name}: ${entry.value}`}
          </p>
        ))}
        <p className="mt-1">Total: {data.total}</p>
      </div>
    );
  }
  return null;
};


export function TopicExplorer({ data, onTopicSelect, activeTopic }: TopicExplorerProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center">
            <BarChart3 className="mr-2 h-6 w-6 text-primary" />
            Topic Explorer
          </CardTitle>
          <CardDescription>No topic data available.</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">Upload and analyze data to see topic distribution.</p>
        </CardContent>
      </Card>
    );
  }

  const handleBarClick = (payload: any) => {
    // Recharts click payload for BarChart can be tricky. We check the activeLabel if available.
    if (payload && payload.activeLabel) {
        const topicName = payload.activeLabel;
        onTopicSelect(activeTopic === topicName ? null : topicName);
    } else if (payload && payload.activePayload && payload.activePayload.length > 0) {
        // Fallback for cases where activeLabel might not be populated as expected
        const topicName = payload.activePayload[0].payload.name;
        onTopicSelect(activeTopic === topicName ? null : topicName);
    }
  };
  
  const sortedData = [...data].sort((a, b) => b.total - a.total).slice(0, 10); // Show top 10 topics by total volume

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline flex items-center">
          <BarChart3 className="mr-2 h-6 w-6 text-primary" />
          Topic Explorer
        </CardTitle>
        <CardDescription>
          Sentiment breakdown per topic. Click a bar to filter. (Top 10 topics shown)
          {activeTopic && (
            <span className="ml-2 font-semibold text-primary">Filtered by: {activeTopic}</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* ChartContainer helps with theming if its config prop is used, but for stacked bar, colors are direct */}
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
                data={sortedData} 
                layout="vertical" 
                margin={{ top: 5, right: 30, left: 20, bottom: 20 }} // Increased bottom margin for legend
                onClick={handleBarClick}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
              <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} stroke="hsl(var(--muted-foreground))"/>
              <YAxis 
                dataKey="name" 
                type="category" 
                tickLine={false} 
                axisLine={false} 
                tickMargin={8} 
                width={100}
                tickFormatter={(value) => value.length > 12 ? `${value.substring(0,10)}...` : value}
                stroke="hsl(var(--muted-foreground))"
              />
              <RechartsTooltip content={<CustomTooltipContent />} cursor={{ fill: 'hsl(var(--accent) / 0.1)' }}/>
              <Legend wrapperStyle={{fontSize: "0.75rem"}}/>
              <Bar dataKey="positive" stackId="a" name="Positive" fill={POSITIVE_COLOR} radius={[0, 4, 4, 0]} barSize={20} cursor="pointer" />
              <Bar dataKey="neutral" stackId="a" name="Neutral" fill={NEUTRAL_COLOR} barSize={20} cursor="pointer"/>
              <Bar dataKey="negative" stackId="a" name="Negative" fill={NEGATIVE_COLOR} radius={[0, 4, 4, 0]} barSize={20} cursor="pointer" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
