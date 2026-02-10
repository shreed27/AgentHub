'use client';

import { useState, useCallback } from 'react';

export interface TokenAnalysisInput {
  symbol: string;
  mint?: string;
  currentPrice: number;
  priceChange24h?: number;
  volume24h?: number;
  marketCap?: number;
  liquidity?: number;
}

export interface TokenAnalysisResult {
  signal: 'strong_buy' | 'buy' | 'watch' | 'avoid' | 'sell';
  confidence: number;
  reasoning: string;
  risk: string;
  strategy?: string;
}

interface UseTokenAnalysisReturn {
  analyze: (token: TokenAnalysisInput) => Promise<TokenAnalysisResult | null>;
  isAnalyzing: boolean;
  result: TokenAnalysisResult | null;
  error: string | null;
  clearResult: () => void;
}

/**
 * Hook for on-demand AI token analysis
 * Calls the /api/ai-analysis endpoint to get AI-powered trading insights
 */
export function useTokenAnalysis(): UseTokenAnalysisReturn {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<TokenAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (token: TokenAnalysisInput): Promise<TokenAnalysisResult | null> => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(token),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Analysis failed');
      }

      const analysisResult = data.data as TokenAnalysisResult;
      setResult(analysisResult);
      return analysisResult;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Analysis failed';
      setError(errorMessage);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    analyze,
    isAnalyzing,
    result,
    error,
    clearResult,
  };
}

export default useTokenAnalysis;
