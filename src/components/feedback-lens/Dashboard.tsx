
import React, { useMemo } from 'react';
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
  const filteredFeedbackItems = useMemo(() => {
    if (!activeTopicFilter) {
      return data.feedbackItems;
    }
    return data.feedbackItems.filter(item => 
      item.topics && item.topics.includes(activeTopicFilter)
    );
  }, [data.feedbackItems, activeTopicFilter]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="grid gap-6 md:grid-cols-3"> {/* Adjusted grid for KPI cards + chart */}
        <div className="md:col-span-3"> {/* SentimentChart and its KPIs will take full width initially */}
          <SentimentChart feedbackItems={filteredFeedbackItems} />
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
         {/* KeyInsightsCard and TopicExplorer will share a row */}
        <div className="lg:col-span-1"> {/* KeyInsights takes 1/3 on large screens */}
            <KeyInsightsCard 
                feedbackItems={filteredFeedbackItems} 
                urgentIssue={data.keyInsights?.urgentIssue}
            />
        </div>
        <div className="lg:col-span-2"> {/* TopicExplorer takes 2/3 on large screens */}
            <TopicExplorer 
            data={data.topicDistribution} 
            onTopicSelect={onTopicSelect}
            activeTopic={activeTopicFilter}
            />
        </div>
      </div>
      
      <div>
        <FeedbackDataTable data={filteredFeedbackItems} activeTopicFilter={activeTopicFilter} />
      </div>
    </div>
  );
}
