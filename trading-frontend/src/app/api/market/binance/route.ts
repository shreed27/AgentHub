import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const symbols = searchParams.get('symbols');

        if (!symbols) {
            return NextResponse.json(
                { error: 'Symbols parameter is required' },
                { status: 400 }
            );
        }

        // Fetch from Binance API server-side (no CORS issues)
        const binanceUrl = `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(symbols)}`;
        const response = await fetch(binanceUrl, {
            headers: {
                'Accept': 'application/json',
            },
            next: { revalidate: 0 }, // Don't cache
        });

        if (!response.ok) {
            throw new Error(`Binance API error: ${response.statusText}`);
        }

        const data = await response.json();

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching market data:', error);
        return NextResponse.json(
            { error: 'Failed to fetch market data' },
            { status: 500 }
        );
    }
}
