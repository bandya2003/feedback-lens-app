export type FeedbackSentimentLabel = 'positive' | 'negative' | 'neutral';

export interface RawFeedbackItem {
  // Represents a single row from the CSV, keys are header names
  [key: string]: string;
}

export interface FeedbackItem {
  id: string; // Unique ID for React keys
  originalIndex: number; // To keep original order if needed
  fullData: RawFeedbackItem; // Store all original CSV fields
  feedbackText: string;
  timestamp?: Date; // Parsed timestamp
  sentiment?: FeedbackSentimentLabel;
  sentimentScore?: number;
  topics?: string[];
}

export interface SentimentDataPoint {
  date: string; // Formatted as YYYY-MM-DD or other suitable format for charts
  positive: number;
  negative: number;
  neutral: number;
}

export interface TopicCount {
  name: string;
  value: number; // Volume of comments
}

export interface KeyInsights {
  urgentIssue: string;
  overallSentiment: string;
}

export interface ProcessedFeedbackData {
  feedbackItems: FeedbackItem[];
  sentimentOverTime: SentimentDataPoint[];
  topicDistribution: TopicCount[];
  keyInsights: KeyInsights | null;
}

// Type for column mapping selection
export interface ColumnMapping {
  feedbackTextColumn: string;
  timestampColumn?: string; // Optional timestamp column
}
