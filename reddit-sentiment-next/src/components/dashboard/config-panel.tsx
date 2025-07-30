'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Settings, Database, Clock, TrendingUp } from 'lucide-react';
import { DashboardConfig, ProcessingStatus } from '@/types';

interface ConfigPanelProps {
  config: DashboardConfig;
  onConfigChange: (config: DashboardConfig) => void;
  status?: ProcessingStatus;
  onForceRefresh: () => void;
  isLoading: boolean;
}

export function ConfigPanel({
  config,
  onConfigChange,
  status,
  onForceRefresh,
  isLoading,
}: ConfigPanelProps) {
  const [localConfig, setLocalConfig] = useState(config);

  const handleConfigUpdate = (updates: Partial<DashboardConfig>) => {
    const newConfig = { ...localConfig, ...updates };
    setLocalConfig(newConfig);
    onConfigChange(newConfig);
  };

  const StatusIndicator = ({ ready, label }: { ready: boolean; label: string }) => (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-600">{label}</span>
      <Badge variant={ready ? 'default' : 'secondary'} className="text-xs">
        {ready ? 'Ready' : 'Offline'}
      </Badge>
    </div>
  );

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center space-x-2">
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Dashboard Configuration</span>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Data Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Database className="w-5 h-5" />
                <span>Data Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Reddit Posts to Analyze: {localConfig.post_limit}
                </label>
                <Slider
                  value={[localConfig.post_limit]}
                  onValueChange={([value]) => handleConfigUpdate({ post_limit: value })}
                  min={10}
                  max={500}
                  step={10}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>10</span>
                  <span>500</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Top Stocks to Show: {localConfig.stock_limit}
                </label>
                <Slider
                  value={[localConfig.stock_limit]}
                  onValueChange={([value]) => handleConfigUpdate({ stock_limit: value })}
                  min={5}
                  max={50}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>5</span>
                  <span>50</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Status */}
          {status && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5" />
                  <span>System Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <StatusIndicator
                    ready={status.reddit_scraper_ready}
                    label="Reddit Scraper"
                  />
                  
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-600">Cache Status</span>
                    <div className="flex space-x-2">
                      {status.cache_available && (
                        <Badge variant={status.cache_valid ? 'default' : 'secondary'} className="text-xs">
                          {status.cache_valid ? 'Valid' : 'Expired'}
                        </Badge>
                      )}
                      {!status.cache_available && (
                        <Badge variant="outline" className="text-xs">No Cache</Badge>
                      )}
                    </div>
                  </div>

                  {status.last_update && (
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-600">Last Update</span>
                      <span className="text-xs text-gray-500">
                        {new Date(status.last_update).toLocaleTimeString()}
                      </span>
                    </div>
                  )}

                  {status.cache_expires && status.cache_valid && (
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-600">Cache Expires</span>
                      <span className="text-xs text-gray-500">
                        {new Date(status.cache_expires).toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span>Actions</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={onForceRefresh}
                disabled={isLoading}
                className="w-full"
                variant="default"
              >
                {isLoading ? 'Refreshing...' : 'Force Refresh Data'}
              </Button>
              
              <p className="text-xs text-gray-500">
                Force refresh will bypass cache and fetch fresh data from Reddit. 
                This may take longer but ensures the most current information.
              </p>
            </CardContent>
          </Card>

          {/* Info */}
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-gray-600 space-y-2">
                <p className="font-medium">How it works:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Fetches posts from r/wallstreetbets using Reddit's JSON API</li>
                  <li>Extracts stock tickers using pattern matching</li>
                  <li>Analyzes sentiment using natural language processing</li>
                  <li>Caches results for 30 minutes to improve performance</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}