'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { StockMention } from '@/types';
import { formatDistanceToNow } from 'date-fns';

interface StockTableProps {
  stockMentions: StockMention[];
}

type SortField = 'ticker' | 'mention_count' | 'sentiment_score' | 'last_updated';
type SortDirection = 'asc' | 'desc';

export function StockTable({ stockMentions }: StockTableProps) {
  const [sortField, setSortField] = useState<SortField>('mention_count');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedData = [...stockMentions].sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    if (sortField === 'last_updated') {
      aValue = a.last_updated.getTime();
      bValue = b.last_updated.getTime();
    }

    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const getSentimentBadge = (category: string, score: number) => {
    let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'secondary';
    let className = '';

    switch (category) {
      case 'Positive':
        variant = 'default';
        className = 'bg-green-100 text-green-800 hover:bg-green-200';
        break;
      case 'Negative':
        variant = 'destructive';
        className = 'bg-red-100 text-red-800 hover:bg-red-200';
        break;
      case 'Neutral':
        variant = 'secondary';
        className = 'bg-gray-100 text-gray-800 hover:bg-gray-200';
        break;
    }

    return (
      <Badge variant={variant} className={className}>
        {category}
      </Badge>
    );
  };

  const formatSentimentScore = (score: number) => {
    return score > 0 ? `+${score.toFixed(3)}` : score.toFixed(3);
  };

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 data-[state=open]:bg-accent"
      onClick={() => handleSort(field)}
    >
      {children}
      {sortField === field ? (
        sortDirection === 'desc' ? (
          <ArrowDown className="ml-2 h-4 w-4" />
        ) : (
          <ArrowUp className="ml-2 h-4 w-4" />
        )
      ) : (
        <ArrowUpDown className="ml-2 h-4 w-4" />
      )}
    </Button>
  );

  if (stockMentions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stock Sentiment Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500">No stock data available to display.</p>
            <p className="text-sm text-gray-400 mt-2">
              Try refreshing the data or check your internet connection.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Stock Sentiment Analysis
          <Badge variant="outline" className="text-xs">
            {stockMentions.length} stocks
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">
                  <SortButton field="ticker">Ticker</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton field="mention_count">Mentions</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton field="sentiment_score">Score</SortButton>
                </TableHead>
                <TableHead>Sentiment</TableHead>
                <TableHead>
                  <SortButton field="last_updated">Updated</SortButton>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((stock) => (
                <TableRow key={stock.ticker} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="font-mono font-semibold text-blue-600">
                      ${stock.ticker}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{stock.mention_count}</span>
                      <div className="w-full bg-gray-200 rounded-full h-2 max-w-[60px]">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{
                            width: `${Math.min(
                              (stock.mention_count / Math.max(...stockMentions.map(s => s.mention_count))) * 100,
                              100
                            )}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`font-mono font-medium ${
                        stock.sentiment_score > 0
                          ? 'text-green-600'
                          : stock.sentiment_score < 0
                          ? 'text-red-600'
                          : 'text-gray-600'
                      }`}
                    >
                      {formatSentimentScore(stock.sentiment_score)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {getSentimentBadge(stock.sentiment_category, stock.sentiment_score)}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {formatDistanceToNow(stock.last_updated, { addSuffix: true })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}