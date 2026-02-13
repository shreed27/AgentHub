"use client";

import React, { useEffect, useRef, memo } from 'react';

interface TradingViewChartProps {
    symbol: string;
    theme?: 'light' | 'dark';
    autosize?: boolean;
}

function TradingViewChart({ symbol, theme = 'dark', autosize = true }: TradingViewChartProps) {
    const container = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!container.current) return;

        // Clean up previous script if any
        container.current.innerHTML = '';

        const script = document.createElement("script");
        script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
        script.type = "text/javascript";
        script.async = true;

        // Convert symbol format if needed (e.g., SOL/USDT -> BINANCE:SOLUSDT)
        let formattedSymbol = symbol.includes(':') ? symbol : symbol.replace('/', '').toUpperCase();
        if (!formattedSymbol.includes(':')) {
            // Ensure USDT suffix for BINANCE if it's missing but we want to force it
            // or just use what we have. Most symbols in the app are already SYMBOL/USDT.
            formattedSymbol = `BINANCE:${formattedSymbol}`;
        }

        script.innerHTML = JSON.stringify({
            "autosize": autosize,
            "symbol": formattedSymbol,
            "interval": "1",
            "timezone": "Etc/UTC",
            "theme": theme,
            "style": "1",
            "locale": "en",
            "enable_publishing": false,
            "allow_symbol_change": true,
            "calendar": false,
            "support_host": "https://www.tradingview.com",
            "backgroundColor": "#09090b",
            "gridColor": "rgba(255, 255, 255, 0.03)",
            "hide_top_toolbar": false,
            "save_image": false,
        });

        container.current.appendChild(script);
    }, [symbol, theme, autosize]);

    return (
        <div className="tradingview-widget-container" ref={container} style={{ height: "100%", width: "100%" }}>
            <div className="tradingview-widget-container__widget" style={{ height: "100%", width: "100%" }}></div>
        </div>
    );
}

export default memo(TradingViewChart);
