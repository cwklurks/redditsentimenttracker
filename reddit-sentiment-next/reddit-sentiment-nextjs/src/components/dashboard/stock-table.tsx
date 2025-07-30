'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { StockMention } from '@/types';
import { formatSentimentScore, getSentimentBadgeColor } from '@/lib/utils';

interface StockTableProps {
  stockMentions: StockMention[];
  isLoading: boolean;
}

export function StockTable({ stockMentions, isLoading }: StockTableProps) {
  const getSentimentIcon = (sentiment: 'Positive' | 'Negative' | 'Neutral') => {
    switch (sentiment) {
      case 'Positive':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'Negative':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stock Mentions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-sm text-gray-600">Loading stock data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (stockMentions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stock Mentions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <p className="text-gray-500 mb-2">No stock data available</p>
              <p className="text-sm text-gray-400">Try refreshing or adjusting your settings</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span>Stock Mentions</span>
          <Badge variant="outline" className="ml-2">
            {stockMentions.length} stocks
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Rank</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead className="text-center">Mentions</TableHead>
                <TableHead className="text-center">Sentiment</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead className="text-center">Category</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stockMentions.map((stock, index) => (
                <TableRow key={stock.ticker} className="hover:bg-gray-50">
                  <TableCell className="font-medium text-gray-500">
                    #{index + 1}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-lg">${stock.ticker}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center">
                      <span className="font-semibold">{stock.mention_count}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center">
                      {getSentimentIcon(stock.sentiment_category)}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span 
                      className={`font-mono text-sm ${
                        stock.sentiment_score > 0.05 
                          ? 'text-green-600' 
                          : stock.sentiment_score < -0.05 
                            ? 'text-red-600' 
                            : 'text-gray-500'
                      }`}
                    >
                      {formatSentimentScore(stock.sentiment_score)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={getSentimentBadgeColor(stock.sentiment_category)}>
                      {stock.sentiment_category}
                    </Badge>
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