import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatSentimentScore(score: number): string {
  if (score > 0) {
    return `+${score.toFixed(3)}`;
  }
  return score.toFixed(3);
}

export function getSentimentColor(sentiment: 'Positive' | 'Negative' | 'Neutral'): string {
  const colorMap = {
    'Positive': 'text-green-600',
    'Negative': 'text-red-600',
    'Neutral': 'text-gray-500'
  };
  return colorMap[sentiment];
}

export function getSentimentBadgeColor(sentiment: 'Positive' | 'Negative' | 'Neutral'): string {
  const colorMap = {
    'Positive': 'bg-green-100 text-green-800',
    'Negative': 'bg-red-100 text-red-800',
    'Neutral': 'bg-gray-100 text-gray-800'
  };
  return colorMap[sentiment];
}

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function isValidTicker(ticker: string): boolean {
  // Basic ticker validation
  return /^[A-Z]{1,5}$/.test(ticker);
}
