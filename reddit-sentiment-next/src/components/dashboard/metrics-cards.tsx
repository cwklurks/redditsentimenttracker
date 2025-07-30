'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import { StockMention } from '@/types';

interface MetricsCardsProps {
  stockMentions: StockMention[];
}

export function MetricsCards({ stockMentions }: MetricsCardsProps) {
  const totalStocks = stockMentions.length;
  const positiveCount = stockMentions.filter(s => s.sentiment_category === 'Positive').length;
  const negativeCount = stockMentions.filter(s => s.sentiment_category === 'Negative').length;
  const neutralCount = stockMentions.filter(s => s.sentiment_category === 'Neutral').length;
  const totalMentions = stockMentions.reduce((sum, stock) => sum + stock.mention_count, 0);

  const metrics = [
    {
      title: 'Total Stocks',
      value: totalStocks,
      icon: BarChart3,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Positive Sentiment',
      value: positiveCount,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      percentage: totalStocks > 0 ? Math.round((positiveCount / totalStocks) * 100) : 0,
    },
    {
      title: 'Negative Sentiment',
      value: negativeCount,
      icon: TrendingDown,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      percentage: totalStocks > 0 ? Math.round((negativeCount / totalStocks) * 100) : 0,
    },
    {
      title: 'Neutral Sentiment',
      value: neutralCount,
      icon: Minus,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      percentage: totalStocks > 0 ? Math.round((neutralCount / totalStocks) * 100) : 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {metric.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                <Icon className={`w-4 h-4 ${metric.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className={`text-2xl font-bold ${metric.color}`}>
                  {metric.value}
                </div>
                {metric.percentage !== undefined && (
                  <Badge variant="secondary" className="text-xs">
                    {metric.percentage}%
                  </Badge>
                )}
              </div>
              {index === 0 && totalMentions > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {totalMentions.toLocaleString()} total mentions
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}