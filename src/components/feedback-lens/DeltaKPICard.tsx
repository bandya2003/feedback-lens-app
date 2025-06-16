
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DeltaKPICardProps {
  metricName: string;
  currentValue: number;
  previousValue: number;
  positiveIsGood?: boolean; // If true, an increase is green. If false, a decrease is green. Defaults to true.
  unit?: string; // e.g., "%"
}

export function DeltaKPICard({
  metricName,
  currentValue,
  previousValue,
  positiveIsGood = true,
  unit = '',
}: DeltaKPICardProps) {
  let change = currentValue - previousValue;
  let percentageChange: number | null = null;

  if (previousValue !== 0) {
    percentageChange = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
  } else if (currentValue !== 0) {
    percentageChange = Infinity; // Represents a new metric or infinite increase from zero
  } else {
    percentageChange = 0; // Both are zero
  }

  const isIncrease = change > 0;
  const isDecrease = change < 0;
  
  let changeColor = 'text-muted-foreground'; // Neutral color for no change or "New"
  let ArrowIcon = Minus;

  if (percentageChange === Infinity) {
    // New metric or infinite increase
    changeColor = 'text-primary'; 
    ArrowIcon = ArrowUp;
  } else if (isIncrease) {
    changeColor = positiveIsGood ? 'text-green-600' : 'text-red-600';
    ArrowIcon = ArrowUp;
  } else if (isDecrease) {
    changeColor = positiveIsGood ? 'text-red-600' : 'text-green-600';
    ArrowIcon = ArrowDown;
  }
  
  const formattedPercentageChange = 
    percentageChange === Infinity ? "New" :
    percentageChange === null || isNaN(percentageChange) ? "N/A" :
    `${percentageChange.toFixed(0)}%`;

  return (
    <Card className="shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{metricName}</CardTitle>
        <ArrowIcon className={cn("h-4 w-4", changeColor)} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{currentValue.toLocaleString()}{unit}</div>
        <p className={cn("text-xs", changeColor)}>
          {change !== 0 && percentageChange !== Infinity && (change > 0 ? '+' : '')}
          {change.toLocaleString()}{unit}
          {previousValue !== 0 && percentageChange !== Infinity && ` (${formattedPercentageChange})`}
          {percentageChange === Infinity && ` (New)`}
          {previousValue === 0 && currentValue === 0 && ` (No Change)`}
        </p>
      </CardContent>
    </Card>
  );
}
