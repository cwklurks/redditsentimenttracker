'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
} from 'recharts';
import { StockMention } from '@/types';

interface SentimentChartsProps {
  stockMentions: StockMention[];
  isLoading: boolean;
}

const SENTIMENT_COLORS = {
  Positive: '#10b981',
  Negative: '#ef4444',
  Neutral: '#6b7280',
};

export function SentimentCharts({ stockMentions, isLoading }: SentimentChartsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (stockMentions.length === 0) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-center h-64">
                <p className="text-gray-500">No data available</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Prepare data for bar chart (top 10 stocks by mentions)
  const topStocksData = stockMentions.slice(0, 10).map(stock => ({
    ticker: stock.ticker,
    mentions: stock.mention_count,
    sentiment: stock.sentiment_score,
    color: SENTIMENT_COLORS[stock.sentiment_category],
  }));

  // Prepare data for pie chart (sentiment distribution)
  const sentimentDistribution = stockMentions.reduce(
    (acc, stock) => {
      acc[stock.sentiment_category]++;
      return acc;
    },
    { Positive: 0, Negative: 0, Neutral: 0 }
  );

  const pieData = Object.entries(sentimentDistribution).map(([category, count]) => ({
    name: category,
    value: count,
    color: SENTIMENT_COLORS[category as keyof typeof SENTIMENT_COLORS],
  }));

  // Prepare data for scatter plot (mentions vs sentiment)
  const scatterData = stockMentions.map(stock => ({
    x: stock.mention_count,
    y: stock.sentiment_score,
    ticker: stock.ticker,
    category: stock.sentiment_category,
  }));

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { ticker: string; mentions: number; sentiment: number } }>; label?: string }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-semibold">${data.ticker}</p>
          <p className="text-sm text-gray-600">
            Mentions: {data.mentions}
          </p>
          <p className="text-sm text-gray-600">
            Sentiment: {data.sentiment?.toFixed(3)}
          </p>
        </div>
      );
    }
    return null;
  };

  const ScatterTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { x: number; y: number; ticker: string; category: string } }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-semibold">${data.ticker}</p>
          <p className="text-sm text-gray-600">Mentions: {data.x}</p>
          <p className="text-sm text-gray-600">Sentiment: {data.y.toFixed(3)}</p>
          <p className="text-sm text-gray-600">Category: {data.category}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Top Stocks Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Top Mentioned Stocks</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topStocksData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="ticker" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="mentions" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Sentiment Distribution Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Sentiment Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value, percent }) => `${name}: ${value} (${((percent || 0) * 100).toFixed(1)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Mentions vs Sentiment Scatter Plot */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Mentions vs Sentiment Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid />
              <XAxis 
                type="number" 
                dataKey="x" 
                name="mentions" 
                label={{ value: 'Mention Count', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                type="number" 
                dataKey="y" 
                name="sentiment" 
                domain={[-1, 1]}
                label={{ value: 'Sentiment Score', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip content={<ScatterTooltip />} />
              <Scatter 
                name="Positive" 
                data={scatterData.filter(d => d.category === 'Positive')} 
                fill={SENTIMENT_COLORS.Positive}
              />
              <Scatter 
                name="Negative" 
                data={scatterData.filter(d => d.category === 'Negative')} 
                fill={SENTIMENT_COLORS.Negative}
              />
              <Scatter 
                name="Neutral" 
                data={scatterData.filter(d => d.category === 'Neutral')} 
                fill={SENTIMENT_COLORS.Neutral}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}