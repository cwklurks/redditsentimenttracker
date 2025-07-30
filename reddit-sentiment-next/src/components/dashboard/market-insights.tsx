'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  RotateCcw, 
  Eye, 
  AlertTriangle,
  Lightbulb 
} from 'lucide-react';
import { StockMention, MarketInsights } from '@/types';

interface MarketInsightsProps {
  stockMentions: StockMention[];
}

export function MarketInsightsComponent({ stockMentions }: MarketInsightsProps) {
  if (stockMentions.length === 0) {
    return null;
  }

  // Calculate key metrics
  const totalMentions = stockMentions.reduce((sum, stock) => sum + stock.mention_count, 0);
  const avgSentiment = totalMentions > 0 
    ? stockMentions.reduce((sum, stock) => sum + (stock.sentiment_score * stock.mention_count), 0) / totalMentions
    : 0;

  const positiveStocks = stockMentions.filter(s => s.sentiment_category === 'Positive');
  const negativeStocks = stockMentions.filter(s => s.sentiment_category === 'Negative');
  const neutralStocks = stockMentions.filter(s => s.sentiment_category === 'Neutral');

  // Most mentioned with strong sentiment
  const strongPositive = positiveStocks.filter(s => s.sentiment_score > 0.5);
  const strongNegative = negativeStocks.filter(s => s.sentiment_score < -0.5);

  // High-volume discussions
  const highVolume = stockMentions.filter(s => s.mention_count >= 5);

  const sentimentDistribution = {
    positive: positiveStocks.length,
    negative: negativeStocks.length,
    neutral: neutralStocks.length,
  };

  // Generate recommendations
  const recommendations: string[] = [];

  // Strong momentum plays
  if (strongPositive.length > 0) {
    const topPositive = strongPositive.reduce((prev, current) => 
      (prev.sentiment_score * prev.mention_count) > (current.sentiment_score * current.mention_count) ? prev : current
    );
    recommendations.push(
      `Momentum Play: $${topPositive.ticker} shows strong positive sentiment (${topPositive.sentiment_score > 0 ? '+' : ''}${topPositive.sentiment_score.toFixed(3)}) with ${topPositive.mention_count} mentions`
    );
  }

  // Contrarian opportunities
  const qualifiedNegative = strongNegative.filter(s => s.mention_count >= 3);
  if (qualifiedNegative.length > 0) {
    const topNegative = qualifiedNegative.reduce((prev, current) => 
      Math.abs(prev.sentiment_score) > Math.abs(current.sentiment_score) ? prev : current
    );
    recommendations.push(
      `Contrarian Opportunity: $${topNegative.ticker} heavily discussed (${topNegative.mention_count} mentions) with strong negative sentiment (${topNegative.sentiment_score.toFixed(3)}) - potential oversold bounce`
    );
  }

  // Volume without direction
  const neutralHighVol = neutralStocks.filter(s => s.mention_count >= 5);
  if (neutralHighVol.length > 0) {
    const topNeutral = neutralHighVol.reduce((prev, current) => 
      prev.mention_count > current.mention_count ? prev : current
    );
    recommendations.push(
      `Watch for Breakout: $${topNeutral.ticker} has high discussion volume (${topNeutral.mention_count} mentions) but neutral sentiment - awaiting catalyst`
    );
  }

  // Risk warnings
  if (negativeStocks.length > positiveStocks.length * 1.5) {
    recommendations.push(
      'Risk Warning: Bearish sentiment dominates - consider defensive positioning'
    );
  }

  if (recommendations.length === 0) {
    recommendations.push('Market sentiment appears balanced. Monitor for emerging trends.');
  }

  const getMarketMoodColor = (sentiment: number) => {
    if (sentiment > 0.1) return 'text-green-600';
    if (sentiment < -0.1) return 'text-red-600';
    return 'text-gray-600';
  };

  const getMarketMoodIcon = (sentiment: number) => {
    if (sentiment > 0.1) return TrendingUp;
    if (sentiment < -0.1) return TrendingDown;
    return Target;
  };

  const MarketMoodIcon = getMarketMoodIcon(avgSentiment);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Key Signals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="w-5 h-5" />
              <span>Key Signals</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Market sentiment overview */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <MarketMoodIcon className={`w-5 h-5 ${getMarketMoodColor(avgSentiment)}`} />
                <span className="font-medium">Market Mood</span>
              </div>
              <div className={`font-bold ${getMarketMoodColor(avgSentiment)}`}>
                {avgSentiment > 0.1 ? 'Bullish' : avgSentiment < -0.1 ? 'Bearish' : 'Neutral'}
                <span className="text-sm ml-2">
                  ({avgSentiment > 0 ? '+' : ''}{avgSentiment.toFixed(3)})
                </span>
              </div>
            </div>

            {/* Strong positive momentum */}
            {strongPositive.length > 0 && (
              <div>
                <h4 className="font-medium text-green-700 mb-2 flex items-center">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  Strong Bullish Signals
                </h4>
                <div className="space-y-2">
                  {strongPositive
                    .sort((a, b) => b.sentiment_score - a.sentiment_score)
                    .slice(0, 3)
                    .map((stock) => (
                      <div key={stock.ticker} className="flex items-center justify-between text-sm">
                        <span className="font-mono font-medium">${stock.ticker}</span>
                        <div className="flex items-center space-x-2">
                          <span>{stock.mention_count} mentions</span>
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            +{stock.sentiment_score.toFixed(3)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Strong negative sentiment */}
            {strongNegative.length > 0 && (
              <div>
                <h4 className="font-medium text-red-700 mb-2 flex items-center">
                  <TrendingDown className="w-4 h-4 mr-1" />
                  Strong Bearish Signals
                </h4>
                <div className="space-y-2">
                  {strongNegative
                    .sort((a, b) => a.sentiment_score - b.sentiment_score)
                    .slice(0, 3)
                    .map((stock) => (
                      <div key={stock.ticker} className="flex items-center justify-between text-sm">
                        <span className="font-mono font-medium">${stock.ticker}</span>
                        <div className="flex items-center space-x-2">
                          <span>{stock.mention_count} mentions</span>
                          <Badge variant="destructive" className="bg-red-100 text-red-800">
                            {stock.sentiment_score.toFixed(3)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trading Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Eye className="w-5 h-5" />
              <span>Trading Insights</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* High-volume discussions */}
            {highVolume.length > 0 && (
              <div>
                <h4 className="font-medium text-blue-700 mb-2 flex items-center">
                  <Target className="w-4 h-4 mr-1" />
                  Most Discussed (High Volume)
                </h4>
                <div className="space-y-2">
                  {highVolume
                    .sort((a, b) => b.mention_count - a.mention_count)
                    .slice(0, 5)
                    .map((stock) => {
                      const sentimentEmoji = 
                        stock.sentiment_category === 'Positive' ? '📈' : 
                        stock.sentiment_category === 'Negative' ? '📉' : '➡️';
                      return (
                        <div key={stock.ticker} className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2">
                            <span>{sentimentEmoji}</span>
                            <span className="font-mono font-medium">${stock.ticker}</span>
                          </div>
                          <span>{stock.mention_count} mentions</span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Sentiment breakdown */}
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Sentiment Breakdown</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Positive</span>
                  <div className="flex items-center space-x-2">
                    <Progress 
                      value={(sentimentDistribution.positive / stockMentions.length) * 100} 
                      className="w-20 h-2" 
                    />
                    <span className="text-sm font-medium">
                      {sentimentDistribution.positive} ({((sentimentDistribution.positive / stockMentions.length) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Negative</span>
                  <div className="flex items-center space-x-2">
                    <Progress 
                      value={(sentimentDistribution.negative / stockMentions.length) * 100} 
                      className="w-20 h-2" 
                    />
                    <span className="text-sm font-medium">
                      {sentimentDistribution.negative} ({((sentimentDistribution.negative / stockMentions.length) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Neutral</span>
                  <div className="flex items-center space-x-2">
                    <Progress 
                      value={(sentimentDistribution.neutral / stockMentions.length) * 100} 
                      className="w-20 h-2" 
                    />
                    <span className="text-sm font-medium">
                      {sentimentDistribution.neutral} ({((sentimentDistribution.neutral / stockMentions.length) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Lightbulb className="w-5 h-5" />
            <span>Actionable Recommendations</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recommendations.map((rec, index) => {
              const getRecommendationIcon = (text: string) => {
                if (text.includes('Momentum')) return Target;
                if (text.includes('Contrarian')) return RotateCcw;
                if (text.includes('Watch')) return Eye;
                if (text.includes('Risk')) return AlertTriangle;
                return Lightbulb;
              };
              
              const getRecommendationColor = (text: string) => {
                if (text.includes('Momentum')) return 'text-green-600';
                if (text.includes('Contrarian')) return 'text-blue-600';
                if (text.includes('Watch')) return 'text-yellow-600';
                if (text.includes('Risk')) return 'text-red-600';
                return 'text-gray-600';
              };

              const RecommendationIcon = getRecommendationIcon(rec);
              const colorClass = getRecommendationColor(rec);

              return (
                <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <RecommendationIcon className={`w-5 h-5 mt-0.5 ${colorClass}`} />
                  <div>
                    <p className="font-medium text-gray-900">{index + 1}.</p>
                    <p className="text-sm text-gray-700 mt-1">{rec}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}