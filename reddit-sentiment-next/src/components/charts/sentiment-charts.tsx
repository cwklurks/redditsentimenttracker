'use client';

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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StockMention } from '@/types';

interface SentimentChartsProps {
  stockMentions: StockMention[];
}

const SENTIMENT_COLORS = {
  Positive: '#16a34a', // green-600
  Negative: '#dc2626', // red-600
  Neutral: '#6b7280', // gray-500
};

export function SentimentCharts({ stockMentions }: SentimentChartsProps) {
  if (stockMentions.length === 0) {
    return null;
  }

  // Prepare data for charts
  const top10Mentioned = stockMentions.slice(0, 10).map(stock => ({
    ticker: stock.ticker,
    mentions: stock.mention_count,
    sentiment: stock.sentiment_score,
    category: stock.sentiment_category,
    color: SENTIMENT_COLORS[stock.sentiment_category as keyof typeof SENTIMENT_COLORS],
  }));

  // Sentiment distribution data
  const sentimentCounts = stockMentions.reduce(
    (acc, stock) => {
      acc[stock.sentiment_category]++;
      return acc;
    },
    { Positive: 0, Negative: 0, Neutral: 0 }
  );

  const pieData = Object.entries(sentimentCounts).map(([category, count]) => ({
    category,
    count,
    color: SENTIMENT_COLORS[category as keyof typeof SENTIMENT_COLORS],
  }));

  // Scatter plot data - mentions vs sentiment
  const scatterData = stockMentions.slice(0, 20).map(stock => ({
    mentions: stock.mention_count,
    sentiment: stock.sentiment_score,
    ticker: stock.ticker,
    category: stock.sentiment_category,
  }));

  // Top sentiment intensity (absolute values)
  const sentimentIntensity = stockMentions
    .map(stock => ({
      ticker: stock.ticker,
      intensity: Math.abs(stock.sentiment_score),
      sentiment: stock.sentiment_score,
      category: stock.sentiment_category,
      color: SENTIMENT_COLORS[stock.sentiment_category as keyof typeof SENTIMENT_COLORS],
    }))
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, 10);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-semibold">{label || data.ticker}</p>
          {payload.map((item: any, index: number) => (
            <p key={index} style={{ color: item.color }}>
              {item.name}: {item.value}
              {item.name === 'sentiment' && data.category && (
                <span className="ml-2 text-sm text-gray-500">({data.category})</span>
              )}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Top Mentioned Stocks */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Most Mentioned Stocks</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={top10Mentioned} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="ticker" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="mentions" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Sentiment Distribution */}
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
                innerRadius={60}
                outerRadius={120}
                paddingAngle={2}
                dataKey="count"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [value, name]}
                labelFormatter={(label) => `${label} Stocks`}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center space-x-4 mt-4">
            {pieData.map((item) => (
              <div key={item.category} className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="text-sm text-gray-600">
                  {item.category} ({item.count})
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Mentions vs Sentiment Scatter */}
      <Card>
        <CardHeader>
          <CardTitle>Mentions vs Sentiment Score</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart data={scatterData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mentions" name="Mentions" />
              <YAxis dataKey="sentiment" name="Sentiment" domain={[-1, 1]} />
              <Tooltip
                formatter={(value, name) => [
                  typeof value === 'number' ? value.toFixed(3) : value,
                  name,
                ]}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0]) {
                    return `$${payload[0].payload.ticker}`;
                  }
                  return label;
                }}
              />
              <Scatter dataKey="sentiment" fill="#8884d8" />
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Sentiment Intensity Ranking */}
      <Card>
        <CardHeader>
          <CardTitle>Strongest Sentiment Signals</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={sentimentIntensity}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="ticker" />
              <YAxis domain={[-1, 1]} />
              <Tooltip
                formatter={(value) => [
                  typeof value === 'number' ? value.toFixed(3) : value,
                  'Sentiment Score',
                ]}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0]) {
                    return `$${label} (${payload[0].payload.category})`;
                  }
                  return `$${label}`;
                }}
              />
              <Bar dataKey="sentiment" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}