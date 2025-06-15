import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ColumnMapping } from '@/types/feedback';

interface ColumnSelectorProps {
  headers: string[];
  onAnalyze: (mapping: ColumnMapping) => void;
  isAnalyzing: boolean;
}

export function ColumnSelector({ headers, onAnalyze, isAnalyzing }: ColumnSelectorProps) {
  const [feedbackTextColumn, setFeedbackTextColumn] = React.useState<string>('');
  const [timestampColumn, setTimestampColumn] = React.useState<string | undefined>(undefined);

  const handleSubmit = () => {
    if (feedbackTextColumn) {
      onAnalyze({ feedbackTextColumn, timestampColumn });
    } else {
      alert('Please select the column containing feedback text.');
    }
  };

  const commonTimestampHeaders = ['timestamp', 'date', 'created_at', 'time', 'submission_date'];
  React.useEffect(() => {
    if (headers.length > 0) {
        // Auto-select first column if only one, or a sensible default
        if (headers.length === 1) {
            setFeedbackTextColumn(headers[0]);
        } else {
             const defaultFeedbackCol = headers.find(h => h.toLowerCase().includes('feedback') || h.toLowerCase().includes('comment')) || headers[0];
             setFeedbackTextColumn(defaultFeedbackCol);
        }

        const foundTimestampCol = headers.find(h => commonTimestampHeaders.includes(h.toLowerCase()));
        if (foundTimestampCol) {
            setTimestampColumn(foundTimestampCol);
        }
    }
  }, [headers]);


  return (
    <Card className="w-full max-w-lg mx-auto mt-6 shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-headline text-center">Map Data Columns</CardTitle>
        <CardDescription className="text-center">
          Tell us which columns contain the feedback text and (optionally) the timestamp.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="feedback-column" className="font-semibold">Feedback Text Column *</Label>
          <Select value={feedbackTextColumn} onValueChange={setFeedbackTextColumn} required>
            <SelectTrigger id="feedback-column" aria-label="Select feedback text column">
              <SelectValue placeholder="Select column for feedback..." />
            </SelectTrigger>
            <SelectContent>
              {headers.map((header) => (
                <SelectItem key={header} value={header}>
                  {header}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="timestamp-column" className="font-semibold">Timestamp Column (Optional)</Label>
          <Select value={timestampColumn} onValueChange={(value) => setTimestampColumn(value === 'none' ? undefined : value)}>
            <SelectTrigger id="timestamp-column" aria-label="Select timestamp column">
              <SelectValue placeholder="Select column for timestamp..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {headers.map((header) => (
                <SelectItem key={header} value={header}>
                  {header}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Select if your CSV has a date/time column for sentiment over time analysis.
          </p>
        </div>

        <Button onClick={handleSubmit} className="w-full" disabled={isAnalyzing || !feedbackTextColumn}>
          {isAnalyzing ? 'Analyzing...' : 'Analyze Feedback'}
        </Button>
      </CardContent>
    </Card>
  );
}
