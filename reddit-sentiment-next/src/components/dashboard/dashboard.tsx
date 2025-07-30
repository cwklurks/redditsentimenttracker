'use client';

import { useState, useEffect, useCallback } from 'react';
import { Header } from './header';
import { MetricsCards } from './metrics-cards';
import { StockTable } from './stock-table';
import { ConfigPanel } from './config-panel';
import { SentimentCharts } from '../charts/sentiment-charts';
import { MarketInsightsComponent } from './market-insights';
import { StockMention, DashboardConfig, ProcessingStatus } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function Dashboard() {
  const [stockData, setStockData] = useState<StockMention[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ProcessingStatus | null>(null);
  const [config, setConfig] = useState<DashboardConfig>({
    post_limit: 200,
    stock_limit: 20,
  });

  const fetchStockData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        post_limit: config.post_limit.toString(),
        stock_limit: config.stock_limit.toString(),
        force_refresh: forceRefresh.toString(),
      });

      const response = await fetch(`/api/stocks?${params}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch stock data');
      }

      if (result.success) {
        // Convert date strings back to Date objects
        const processedData = result.data.map((item: any) => ({
          ...item,
          last_updated: new Date(item.last_updated),
        }));
        
        setStockData(processedData);
        
        if (forceRefresh) {
          toast.success('Data refreshed successfully!', {
            description: `Found ${processedData.length} stocks with recent activity`,
          });
        }
      } else {
        throw new Error(result.error || 'Unknown error occurred');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(errorMessage);
      toast.error('Failed to fetch stock data', {
        description: errorMessage,
      });
      console.error('Error fetching stock data:', err);
    } finally {
      setLoading(false);
    }
  }, [config.post_limit, config.stock_limit]);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/status');
      const result = await response.json();

      if (result.success) {
        setStatus(result.data);
      }
    } catch (err) {
      console.error('Error fetching status:', err);
    }
  }, []);

  const handleConfigChange = useCallback((newConfig: DashboardConfig) => {
    setConfig(newConfig);
    // Automatically refresh data when config changes significantly
    if (newConfig.post_limit !== config.post_limit || newConfig.stock_limit !== config.stock_limit) {
      toast.info('Configuration updated', {
        description: 'Fetching data with new settings...',
      });
      setTimeout(() => fetchStockData(false), 500); // Small delay to show the toast
    }
  }, [config, fetchStockData]);

  const handleRefresh = useCallback(() => {
    fetchStockData(true);
  }, [fetchStockData]);

  const handleForceRefresh = useCallback(() => {
    toast.info('Force refreshing data...', {
      description: 'This may take a moment to fetch fresh data from Reddit',
    });
    fetchStockData(true);
  }, [fetchStockData]);

  // Initial data fetch
  useEffect(() => {
    fetchStockData(false);
    fetchStatus();
  }, [fetchStockData, fetchStatus]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStockData(false);
      fetchStatus();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchStockData, fetchStatus]);

  if (loading && stockData.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8">
          <CardContent className="flex flex-col items-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <div className="text-center">
              <h3 className="text-lg font-semibold">Loading Stock Data</h3>
              <p className="text-sm text-gray-600 mt-1">
                Fetching sentiment data from r/wallstreetbets...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && stockData.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <CardContent className="flex flex-col items-center space-y-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
            <div className="text-center">
              <h3 className="text-lg font-semibold text-red-800">Error Loading Data</h3>
              <p className="text-sm text-gray-600 mt-2">{error}</p>
              <button
                onClick={() => fetchStockData(true)}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                disabled={loading}
              >
                {loading ? 'Retrying...' : 'Try Again'}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header onRefresh={handleRefresh} isLoading={loading} />
      
      <main className="container mx-auto px-4 py-6">
        {/* Success message and controls */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-green-800">
                  Ready to track sentiment
                </p>
                <p className="text-xs text-gray-600">
                  No API credentials required - using Reddit JSON feeds
                </p>
              </div>
            </div>
            
            <ConfigPanel
              config={config}
              onConfigChange={handleConfigChange}
              status={status}
              onForceRefresh={handleForceRefresh}
              isLoading={loading}
            />
          </div>
        </div>

        {/* Metrics Cards */}
        <MetricsCards stockMentions={stockData} />

        {/* Stock Table */}
        <div className="mb-6">
          <StockTable stockMentions={stockData} />
        </div>

        {/* Charts */}
        {stockData.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">
              Sentiment Analysis Charts
            </h2>
            <SentimentCharts stockMentions={stockData} />
          </div>
        )}

        {/* Market Insights */}
        {stockData.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">
              Market Insights & Recommendations
            </h2>
            <MarketInsightsComponent stockMentions={stockData} />
          </div>
        )}

        {/* Last Update Info */}
        {stockData.length > 0 && (
          <div className="text-center text-sm text-gray-500 mt-8">
            Last updated: {new Date(Math.max(...stockData.map(s => s.last_updated.getTime()))).toLocaleString()}
          </div>
        )}

        {/* Footer */}
        <footer className="text-center text-xs text-gray-400 mt-12 pt-8 border-t">
          <p>
            Built with Next.js • Data from Reddit r/wallstreetbets • Sentiment analysis by Natural Language Processing
          </p>
        </footer>
      </main>
    </div>
  );
}