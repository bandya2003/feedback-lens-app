import React from 'react';
import type { ProcessedFeedbackData, FeedbackItem } from '@/types/feedback';
import { SentimentChart } from './SentimentChart';
import { TopicExplorer } from './TopicExplorer';
import { KeyInsightsCard } from './KeyInsightsCard';
import { FeedbackDataTable } from './FeedbackDataTable';

interface DashboardProps {
  data: ProcessedFeedbackData;
  activeTopicFilter: string | null;
  onTopicSelect: (topic: string | null) => void;
}

export function Dashboard({ data, activeTopicFilter, onTopicSelect }: DashboardProps) {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SentimentChart data={data.sentimentOverTime} />
        </div>
        <KeyInsightsCard insights={data.keyInsights} />
      </div>
      
      <div>
        <TopicExplorer 
          data={data.topicDistribution} 
          onTopicSelect={onTopicSelect}
          activeTopic={activeTopicFilter}
        />
      </div>
      
      <div>
        <FeedbackDataTable data={data.feedbackItems} activeTopicFilter={activeTopicFilter} />
      </div>
    </div>
  );
}
