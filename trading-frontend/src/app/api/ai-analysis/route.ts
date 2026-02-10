/**
 * API Route: On-demand AI Token Analysis
 *
 * This endpoint allows users to request AI analysis for a specific token
 * before making a trade decision. Uses Groq API (Llama 3.3 70B).
 */

import { NextRequest, NextResponse } from 'next/server';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

interface TokenAnalysisRequest {
  symbol: string;
  mint?: string;
  currentPrice: number;
  priceChange24h?: number;
  volume24h?: number;
  marketCap?: number;
  liquidity?: number;
}

interface AiAnalysisResponse {
  signal: 'strong_buy' | 'buy' | 'watch' | 'avoid' | 'sell';
  confidence: number;
  reasoning: string;
  risk: string;
  strategy?: string;
}

function buildPrompt(token: TokenAnalysisRequest): string {
  const priceChange = token.priceChange24h !== undefined
    ? `${token.priceChange24h >= 0 ? '+' : ''}${token.priceChange24h.toFixed(2)}%`
    : 'Unknown';

  return `You are a cryptocurrency trading analyst. Analyze this token for trading potential.

TOKEN DATA:
- Symbol: ${token.symbol}
- Current Price: $${token.currentPrice.toFixed(6)}
- 24h Price Change: ${priceChange}
- 24h Volume: ${token.volume24h ? `$${(token.volume24h / 1000).toFixed(1)}K` : 'Unknown'}
- Market Cap: ${token.marketCap ? `$${(token.marketCap / 1000).toFixed(1)}K` : 'Unknown'}
- Liquidity: ${token.liquidity ? `$${(token.liquidity / 1000).toFixed(1)}K` : 'Unknown'}

Analyze the token and provide:
1. A trading signal (strong_buy, buy, watch, avoid, sell)
2. Confidence level (0-100)
3. Brief reasoning (1-2 sentences)
4. Key risk factor
5. Entry/exit strategy if it's a buy signal

RESPONSE FORMAT (JSON only):
{
  "signal": "buy|strong_buy|watch|avoid|sell",
  "confidence": 75,
  "reasoning": "Brief explanation of why",
  "risk": "Key risk to monitor",
  "strategy": "Entry/exit suggestion or null"
}

Consider:
- Price momentum and recent moves
- Volume indicates interest level
- Liquidity affects execution quality
- Market cap shows relative size

Respond with valid JSON only:`;
}

function parseAiResponse(text: string): Partial<AiAnalysisResponse> {
  let jsonStr = text.trim();

  // Remove markdown code blocks if present
  if (jsonStr.startsWith('```json')) {
    jsonStr = jsonStr.slice(7);
  } else if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.slice(3);
  }
  if (jsonStr.endsWith('```')) {
    jsonStr = jsonStr.slice(0, -3);
  }

  jsonStr = jsonStr.trim();

  try {
    return JSON.parse(jsonStr);
  } catch {
    // Try to find JSON object in the response
    const match = jsonStr.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        // Fall through to return empty object
      }
    }
    return {};
  }
}

function generateFallbackAnalysis(token: TokenAnalysisRequest): AiAnalysisResponse {
  const priceChange = token.priceChange24h ?? 0;
  const hasVolume = (token.volume24h ?? 0) > 10000;
  const hasLiquidity = (token.liquidity ?? 0) > 5000;

  let signal: AiAnalysisResponse['signal'] = 'watch';
  let confidence = 50;
  let reasoning: string;
  let risk: string;
  let strategy: string | undefined;

  if (priceChange > 10 && hasVolume && hasLiquidity) {
    signal = 'buy';
    confidence = 65;
    reasoning = `Strong momentum with ${priceChange.toFixed(1)}% gain and healthy volume.`;
    risk = 'Momentum may be exhausted - watch for reversal signs';
    strategy = 'Consider scaling in with small position';
  } else if (priceChange < -20) {
    signal = 'avoid';
    confidence = 60;
    reasoning = `Sharp decline of ${priceChange.toFixed(1)}% suggests selling pressure.`;
    risk = 'Could continue falling - avoid catching falling knife';
  } else if (!hasLiquidity) {
    signal = 'avoid';
    confidence = 70;
    reasoning = 'Low liquidity will cause significant slippage on trades.';
    risk = 'Exit slippage could be 5-10% or more';
  } else {
    signal = 'watch';
    confidence = 45;
    reasoning = 'No clear edge - wait for better setup.';
    risk = 'Market conditions unclear';
  }

  return { signal, confidence, reasoning, risk, strategy };
}

export async function POST(request: NextRequest) {
  try {
    const body: TokenAnalysisRequest = await request.json();

    if (!body.symbol || body.currentPrice === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: symbol, currentPrice' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GROQ_API_KEY;

    // If no API key, use fallback analysis
    if (!apiKey) {
      console.warn('[AI Analysis] No GROQ_API_KEY set, using fallback analysis');
      const fallback = generateFallbackAnalysis(body);
      return NextResponse.json({
        success: true,
        data: fallback,
        source: 'fallback',
      });
    }

    const prompt = buildPrompt(body);

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AI Analysis] Groq API error:', response.status, errorText);
      const fallback = generateFallbackAnalysis(body);
      return NextResponse.json({
        success: true,
        data: fallback,
        source: 'fallback',
      });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    const parsed = parseAiResponse(text);

    const result: AiAnalysisResponse = {
      signal: parsed.signal || 'watch',
      confidence: parsed.confidence ?? 50,
      reasoning: parsed.reasoning || 'Analysis unavailable',
      risk: parsed.risk || 'Unknown risk factors',
      strategy: parsed.strategy || undefined,
    };

    return NextResponse.json({
      success: true,
      data: result,
      source: 'ai',
    });

  } catch (error) {
    console.error('[AI Analysis] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}
