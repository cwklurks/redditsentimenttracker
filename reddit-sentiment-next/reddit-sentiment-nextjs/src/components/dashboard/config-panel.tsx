'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { RefreshCw, Trash2, Info } from 'lucide-react';
import { DashboardConfig } from '@/types';

interface ConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
  config: DashboardConfig;
  onConfigChange: (config: DashboardConfig) => void;
  onRefresh: () => void;
  onForceRefresh: () => void;
  onClearCache: () => void;
  isLoading: boolean;
  cacheStatus?: {
    exists: boolean;
    lastUpdated?: Date;
    ageMinutes?: number;
    postCount?: number;
  };
}

export function ConfigPanel({
  isOpen,
  onClose,
  config,
  onConfigChange,
  onRefresh,
  onForceRefresh,
  onClearCache,
  isLoading,
  cacheStatus,
}: ConfigPanelProps) {
  const handlePostLimitChange = (value: number[]) => {
    onConfigChange({ ...config, postLimit: value[0] });
  };

  const handleTopStocksLimitChange = (value: number[]) => {
    onConfigChange({ ...config, topStocksLimit: value[0] });
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Dashboard Settings</SheetTitle>
          <SheetDescription>
            Configure data collection and display options
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Data Collection Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Data Collection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Reddit Posts to Analyze</label>
                  <Badge variant="outline">{config.postLimit}</Badge>
                </div>
                <Slider
                  value={[config.postLimit]}
                  onValueChange={handlePostLimitChange}
                  max={200}
                  min={10}
                  step={10}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  More posts = better accuracy but slower loading
                </p>
              </div>

              <Separator />

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Top Stocks to Display</label>
                  <Badge variant="outline">{config.topStocksLimit}</Badge>
                </div>
                <Slider
                  value={[config.topStocksLimit]}
                  onValueChange={handleTopStocksLimitChange}
                  max={50}
                  min={5}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Number of top mentioned stocks to show
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Data Refresh Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Data Refresh</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={onRefresh}
                  disabled={isLoading}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </Button>
                
                <Button
                  onClick={onForceRefresh}
                  disabled={isLoading}
                  className="flex items-center space-x-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Force Fresh</span>
                </Button>
              </div>
              
              <Button
                onClick={onClearCache}
                disabled={isLoading}
                variant="destructive"
                className="w-full flex items-center space-x-2"
              >
                <Trash2 className="h-4 w-4" />
                <span>Clear Cache</span>
              </Button>
            </CardContent>
          </Card>

          {/* Cache Status */}
          {cacheStatus && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Info className="h-4 w-4" />
                  <span>Cache Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Cache exists:</span>
                  <Badge variant={cacheStatus.exists ? "default" : "secondary"}>
                    {cacheStatus.exists ? "Yes" : "No"}
                  </Badge>
                </div>
                
                {cacheStatus.exists && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Last updated:</span>
                      <span className="text-sm">
                        {cacheStatus.ageMinutes ? `${Math.round(cacheStatus.ageMinutes)}m ago` : 'Unknown'}
                      </span>
                    </div>
                    
                    {cacheStatus.postCount && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Posts analyzed:</span>
                        <Badge variant="outline">{cacheStatus.postCount}</Badge>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-600">
              <p>• Data is cached for 30 minutes to reduce API calls</p>
              <p>• Uses Reddit&apos;s public JSON feeds (no API key needed)</p>
              <p>• Sentiment analysis uses VADER-equivalent scoring</p>
              <p>• Higher mention counts indicate more discussion</p>
              <p>• Sentiment scores range from -1 (very negative) to +1 (very positive)</p>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}