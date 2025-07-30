'use client';

import { useState, useEffect, useCallback } from 'react';
import { StockMention, ApiResponse, DashboardConfig } from '@/types';
import { Header } from './header';
import { MetricsCards } from './metrics-cards';
import { StockTable } from './stock-table';
import { SentimentCharts } from '../charts/sentiment-charts';
import { ConfigPanel } from './config-panel';
import { useToast } from '@/hooks/use-toast';

const DEFAULT_CONFIG: DashboardConfig = {
  postLimit: 25, // Reduced from 100 to avoid rate limiting
  topStocksLimit: 30, // Increased default to show more stocks
  refreshInterval: 30000, // 30 seconds
  autoRefresh: false,
};

export function Dashboard() {
  const [stockMentions, setStockMentions] = useState<StockMention[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | undefined>();
  const [isCached, setIsCached] = useState(false);
  const [config, setConfig] = useState<DashboardConfig>(DEFAULT_CONFIG);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [cacheStatus, setCacheStatus] = useState<{
    exists: boolean;
    lastUpdated?: Date;
    ageMinutes?: number;
    postCount?: number;
  }>();
  const { toast } = useToast();

  const fetchStockData = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    
    try {
      const params = new URLSearchParams({
        postLimit: config.postLimit.toString(),
        topStocksLimit: config.topStocksLimit.toString(),
        forceRefresh: forceRefresh.toString(),
      });

      const response = await fetch(`/api/stocks?${params}`);
      const result: ApiResponse<StockMention[]> = await response.json();

      if (result.success && result.data) {
        setStockMentions(result.data);
        setLastUpdated(result.lastUpdated ? new Date(result.lastUpdated) : new Date());
        setIsCached(result.cached || false);
        
        toast({
          title: forceRefresh ? "Fresh data loaded" : "Data updated",
          description: `Loaded ${result.data.length} stock mentions${result.cached ? ' (from cache)' : ''}`,
        });
      } else {
        throw new Error(result.error || 'Failed to fetch data');
      }
    } catch (error) {
      console.error('Error fetching stock data:', error);
      toast({
        title: "Error loading data",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [config.postLimit, config.topStocksLimit, toast]);

  const fetchCacheStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/status');
      const result = await response.json();
      if (result.success) {
        setCacheStatus(result.data);
      }
    } catch (error) {
      console.warn('Failed to fetch cache status:', error);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    fetchStockData(false);
  }, [fetchStockData]);

  const handleForceRefresh = useCallback(() => {
    fetchStockData(true);
  }, [fetchStockData]);

  const handleClearCache = useCallback(async () => {
    try {
      const response = await fetch('/api/stocks', { method: 'DELETE' });
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Cache cleared",
          description: "Data cache has been cleared successfully",
        });
        fetchCacheStatus();
      } else {
        throw new Error(result.error || 'Failed to clear cache');
      }
    } catch (error) {
      toast({
        title: "Error clearing cache",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  }, [toast, fetchCacheStatus]);

  const handleConfigChange = useCallback((newConfig: DashboardConfig) => {
    setConfig(newConfig);
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchStockData();
    fetchCacheStatus();
  }, [fetchStockData, fetchCacheStatus]);

  // Auto-refresh if enabled
  useEffect(() => {
    if (!config.autoRefresh) return;

    const interval = setInterval(() => {
      fetchStockData();
    }, config.refreshInterval);

    return () => clearInterval(interval);
  }, [config.autoRefresh, config.refreshInterval, fetchStockData]);

  // Refetch when config changes (force refresh to bypass cache)
  useEffect(() => {
    // Skip initial render to avoid double-fetch
    if (stockMentions.length > 0) {
      fetchStockData(true); // Force refresh when config changes
    }
  }, [config.postLimit, config.topStocksLimit]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        lastUpdated={lastUpdated}
        isLoading={isLoading}
        isCached={isCached}
        onRefresh={handleRefresh}
        onToggleSettings={() => setIsConfigOpen(true)}
      />

      <div className="container mx-auto px-4 py-8">
        <MetricsCards stockMentions={stockMentions} />
        
        <SentimentCharts stockMentions={stockMentions} isLoading={isLoading} />
        
        <StockTable stockMentions={stockMentions} isLoading={isLoading} />
      </div>

      <ConfigPanel
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        config={config}
        onConfigChange={handleConfigChange}
        onRefresh={handleRefresh}
        onForceRefresh={handleForceRefresh}
        onClearCache={handleClearCache}
        isLoading={isLoading}
        cacheStatus={cacheStatus}
      />
    </div>
  );
}