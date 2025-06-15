import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LabelList } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import type { TopicCount } from '@/types/feedback';
import { BarChart3 } from 'lucide-react';

interface TopicExplorerProps {
  data: TopicCount[];
  onTopicSelect: (topic: string | null) => void;
  activeTopic: string | null;
}

const chartConfig = {
  topics: {
    label: 'Volume',
    color: 'hsl(var(--primary))',
  },
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
    if (payload && payload.activePayload && payload.activePayload.length > 0) {
      const topicName = payload.activePayload[0].payload.name;
      onTopicSelect(activeTopic === topicName ? null : topicName);
    }
  };
  
  // Sort data by value for better visualization
  const sortedData = [...data].sort((a, b) => b.value - a.value).slice(0, 10); // Show top 10 topics

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline flex items-center">
            <BarChart3 className="mr-2 h-6 w-6 text-primary" />
            Topic Explorer
        </CardTitle>
        <CardDescription>
          Volume of comments per topic. Click a bar to filter.
          {activeTopic && (
            <span className="ml-2 font-semibold text-primary">Filtered by: {activeTopic}</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sortedData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }} onClick={handleBarClick}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
              <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false}/>
              <YAxis 
                dataKey="name" 
                type="category" 
                tickLine={false} 
                axisLine={false} 
                tickMargin={8} 
                width={100}
                tickFormatter={(value) => value.length > 12 ? `${value.substring(0,10)}...` : value}
              />
              <ChartTooltip
                cursor={{ fill: 'hsl(var(--accent) / 0.2)' }}
                content={<ChartTooltipContent indicator="dot" />}
              />
              <Bar dataKey="value" name="Volume" radius={4} onClick={handleBarClick} cursor="pointer">
                {sortedData.map((entry, index) => (
                  <Bar
                    key={`bar-${index}`}
                    dataKey="value"
                    fill={activeTopic === entry.name ? 'hsl(var(--accent))' : 'hsl(var(--primary))'}
                    
                  />
                ))}
                 <LabelList dataKey="value" position="right" offset={8} className="fill-foreground" fontSize={12} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
