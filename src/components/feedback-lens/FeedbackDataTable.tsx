
import React, { useState, useMemo, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpDown, ChevronLeft, ChevronRight, ListChecks } from 'lucide-react';
import type { FeedbackItem, FeedbackSentimentLabel } from '@/types/feedback';
import { Badge } from '@/components/ui/badge';

interface FeedbackDataTableProps {
  data: FeedbackItem[];
  activeTopicFilter: string | null;
}

const ITEMS_PER_PAGE = 10;

const SentimentBadge: React.FC<{ sentiment?: FeedbackSentimentLabel }> = ({ sentiment }) => {
  if (!sentiment) return <Badge variant="outline">N/A</Badge>;
  let variant: "default" | "secondary" | "destructive" | "outline" = "outline";
  let textClass = "";

  switch (sentiment) {
    case 'positive':
      variant = 'default'; // Uses primary color (blueish)
      textClass = 'text-primary-foreground';
      break;
    case 'negative':
      variant = 'destructive';
      textClass = 'text-destructive-foreground';
      break;
    case 'neutral':
      variant = 'secondary';
      textClass = 'text-secondary-foreground';
      break;
  }
  return <Badge variant={variant} className={cn("capitalize", textClass)}>{sentiment}</Badge>;
};


export function FeedbackDataTable({ data, activeTopicFilter }: FeedbackDataTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: keyof FeedbackItem | 'topicsDisplay' | null; direction: 'ascending' | 'descending' }>({
    key: null,
    direction: 'ascending',
  });

  useEffect(() => {
    setCurrentPage(1); 
  }, [data, activeTopicFilter, searchTerm, sortConfig]); // Reset page on sort too

  const filteredData = useMemo(() => {
    let items = data;
    // activeTopicFilter is already applied in Dashboard.tsx, so `data` prop is already filtered by topic if needed
    if (searchTerm) {
      items = items.filter(item =>
        item.feedbackText.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.topics && item.topics.join(', ').toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.sentiment && item.sentiment.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    return items.map(item => ({...item, topicsDisplay: item.topics?.join(', ') || ''}));
  }, [data, searchTerm]);

  const sortedData = useMemo(() => {
    let sortableItems = [...filteredData];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        // Type assertion for key access
        const valA = a[sortConfig.key as keyof typeof a];
        const valB = b[sortConfig.key as keyof typeof b];

        let comparison = 0;
        if (valA === undefined || valA === null) comparison = -1;
        else if (valB === undefined || valB === null) comparison = 1;
        else if (typeof valA === 'number' && typeof valB === 'number') {
          comparison = valA - valB;
        } else if (valA instanceof Date && valB instanceof Date) {
          comparison = valA.getTime() - valB.getTime();
        }
         else {
          comparison = String(valA).toLowerCase().localeCompare(String(valB).toLowerCase());
        }
        return sortConfig.direction === 'ascending' ? comparison : comparison * -1;
      });
    }
    return sortableItems;
  }, [filteredData, sortConfig]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedData, currentPage]);

  const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE);

  const requestSort = (key: keyof FeedbackItem | 'topicsDisplay') => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const SortableHeader: React.FC<{ columnKey: keyof FeedbackItem | 'topicsDisplay'; children: React.ReactNode }> = ({ columnKey, children }) => (
    <TableHead onClick={() => requestSort(columnKey)} className="cursor-pointer hover:bg-muted/50">
      <div className="flex items-center">
        {children}
        {sortConfig.key === columnKey && (
          <ArrowUpDown className={`ml-2 h-4 w-4 ${sortConfig.direction === 'ascending' ? 'text-accent' : 'text-accent rotate-180'}`} />
        )}
      </div>
    </TableHead>
  );

  if (!data || data.length === 0 && !activeTopicFilter && !searchTerm) { // Show initial empty state only if truly no data
     return (
      <Card className="shadow-lg mt-6">
        <CardHeader>
           <CardTitle className="font-headline flex items-center">
            <ListChecks className="mr-2 h-6 w-6 text-primary" />
            Live Feedback Table
          </CardTitle>
          <CardDescription>No feedback data to display.</CardDescription>
        </CardHeader>
        <CardContent className="h-[200px] flex items-center justify-center">
          <p className="text-muted-foreground">Upload and analyze data to see feedback details.</p>
        </CardContent>
      </Card>
    );
  }


  return (
    <Card className="shadow-lg mt-6">
      <CardHeader>
        <CardTitle className="font-headline flex items-center">
            <ListChecks className="mr-2 h-6 w-6 text-primary" />
            Live Feedback Table
        </CardTitle>
        <CardDescription>
          Detailed view of individual feedback comments.
          {activeTopicFilter && (
            <span className="ml-1 text-sm text-primary">(Filtered by topic: <Badge variant="secondary">{activeTopicFilter}</Badge>)</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Input
            placeholder="Search feedback comments, sentiments, or topics..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
            aria-label="Search feedback table"
          />
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader columnKey="feedbackText">Comment</SortableHeader>
                <SortableHeader columnKey="sentiment">Sentiment</SortableHeader>
                <SortableHeader columnKey="topicsDisplay">Topic(s)</SortableHeader>
                 {data.some(item => item.timestamp) && <SortableHeader columnKey="timestamp">Timestamp</SortableHeader>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length > 0 ? (
                paginatedData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="max-w-sm truncate text-sm" title={item.feedbackText}>{item.feedbackText}</TableCell>
                    <TableCell><SentimentBadge sentiment={item.sentiment} /></TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {item.topics?.map(topic => (
                          <Badge key={topic} variant="outline" className="text-xs">{topic}</Badge>
                        ))}
                        {!item.topics || item.topics.length === 0 && <span className="text-xs text-muted-foreground">N/A</span>}
                      </div>
                    </TableCell>
                    {data.some(d => d.timestamp) && <TableCell className="text-xs text-muted-foreground">{item.timestamp ? item.timestamp.toLocaleDateString() : 'N/A'}</TableCell>}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={data.some(d => d.timestamp) ? 4 : 3} className="h-24 text-center text-muted-foreground">
                    No results found for your current filters or search term.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-end space-x-2 py-4">
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages} ({sortedData.length} items)
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              aria-label="Go to previous page"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              aria-label="Go to next page"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
