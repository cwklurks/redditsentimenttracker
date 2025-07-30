'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import { StockMention } from '@/types';

interface MetricsCardsProps {
  stockMentions: StockMention[];
}

export function MetricsCards({ stockMentions }: MetricsCardsProps) {
  const totalMentions = stockMentions.reduce((sum, stock) => sum + stock.mention_count, 0);
  const positiveStocks = stockMentions.filter(stock => stock.sentiment_category === 'Positive').length;
  const negativeStocks = stockMentions.filter(stock => stock.sentiment_category === 'Negative').length;
  // const neutralStocks = stockMentions.filter(stock => stock.sentiment_category === 'Neutral').length;
  
  const averageSentiment = stockMentions.length > 0 
    ? stockMentions.reduce((sum, stock) => sum + stock.sentiment_score, 0) / stockMentions.length 
    : 0;

  const getSentimentIcon = (sentiment: number) => {
    if (sentiment > 0.05) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (sentiment < -0.05) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getSentimentColor = (sentiment: number) => {
    if (sentiment > 0.05) return 'text-green-600';
    if (sentiment < -0.05) return 'text-red-600';
    return 'text-gray-500';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Stocks</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stockMentions.length}</div>
          <p className="text-xs text-muted-foreground">
            {totalMentions} total mentions
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Average Sentiment</CardTitle>
          {getSentimentIcon(averageSentiment)}
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getSentimentColor(averageSentiment)}`}>
            {averageSentiment > 0 ? '+' : ''}{averageSentiment.toFixed(3)}
          </div>
          <p className="text-xs text-muted-foreground">
            Compound sentiment score
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Positive Stocks</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{positiveStocks}</div>
          <p className="text-xs text-muted-foreground">
            {stockMentions.length > 0 ? Math.round((positiveStocks / stockMentions.length) * 100) : 0}% of total
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Negative Stocks</CardTitle>
          <TrendingDown className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{negativeStocks}</div>
          <p className="text-xs text-muted-foreground">
            {stockMentions.length > 0 ? Math.round((negativeStocks / stockMentions.length) * 100) : 0}% of total
          </p>
        </CardContent>
      </Card>
    </div>
  );
}