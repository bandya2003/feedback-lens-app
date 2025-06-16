
import {z} from 'genkit';

// Schemas for data to be saved/retrieved
export const FeedbackSentimentLabelSchema = z.enum(['positive', 'negative', 'neutral']);

export const RawFeedbackItemSchema = z.record(z.string()); // [key: string]: string

export const FeedbackItemSchema = z.object({
  id: z.string(),
  originalIndex: z.number(),
  fullData: RawFeedbackItemSchema,
  feedbackText: z.string(),
  timestamp: z.string().datetime({ offset: true }).optional().describe("ISO 8601 datetime string if available"),
  sentiment: FeedbackSentimentLabelSchema.optional(),
  sentimentScore: z.number().optional(),
  topics: z.array(z.string()).optional(),
});

export const SentimentDataPointSchema = z.object({
  date: z.string(),
  positive: z.number(),
  negative: z.number(),
  neutral: z.number(),
});

export const TopicSentimentDistributionSchema = z.object({
  name: z.string(),
  positive: z.number(),
  negative: z.number(),
  neutral: z.number(),
  total: z.number(),
});

export const KeyInsightsSchema = z.object({
  urgentIssue: z.string(),
  overallSentiment: z.string(),
}).nullable();

export const ProcessedFeedbackDataSchema = z.object({
  feedbackItems: z.array(FeedbackItemSchema),
  sentimentOverTime: z.array(SentimentDataPointSchema),
  topicDistribution: z.array(TopicSentimentDistributionSchema),
  keyInsights: KeyInsightsSchema,
});
export type ProcessedFeedbackDataForSave = z.infer<typeof ProcessedFeedbackDataSchema>;
