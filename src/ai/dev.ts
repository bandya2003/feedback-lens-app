import { config } from 'dotenv';
config();

import '@/ai/flows/analyze-feedback-sentiment.ts';
import '@/ai/flows/extract-feedback-topics.ts';
import '@/ai/flows/surface-urgent-issues.ts';