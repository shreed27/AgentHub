import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const symbol = searchParams.get('symbol') || 'BTCUSDT';
        const limit = searchParams.get('limit') || '50';

        // Fetch recent trades from Binance
        const response = await fetch(
            `https://api.binance.com/api/v3/trades?symbol=${symbol}&limit=${limit}`,
            {
                headers: {
                    'Accept': 'application/json',
                },
                next: { revalidate: 0 }, // Don't cache
            }
        );

        if (!response.ok) {
            throw new Error(`Binance API error: ${response.statusText}`);
        }

        const data = await response.json();

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching trades:', error);
        return NextResponse.json(
            { error: 'Failed to fetch trades' },
            { status: 500 }
        );
    }
}
