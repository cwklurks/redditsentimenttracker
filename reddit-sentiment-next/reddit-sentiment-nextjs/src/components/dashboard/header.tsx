'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, TrendingUp, Settings } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';

interface HeaderProps {
  lastUpdated?: Date;
  isLoading: boolean;
  isCached: boolean;
  onRefresh: () => void;
  onToggleSettings: () => void;
}

export function Header({ lastUpdated, isLoading, isCached, onRefresh, onToggleSettings }: HeaderProps) {
  return (
    <div className="border-b bg-white">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Reddit Stock Sentiment
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Real-time sentiment analysis from r/wallstreetbets
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {lastUpdated && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>Last updated: {formatRelativeTime(lastUpdated)}</span>
                {isCached && (
                  <Badge variant="secondary" className="text-xs">
                    Cached
                  </Badge>
                )}
              </div>
            )}
            
            <Button
              onClick={onRefresh}
              disabled={isLoading}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Loading...' : 'Refresh'}</span>
            </Button>
            
            <Button
              onClick={onToggleSettings}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}