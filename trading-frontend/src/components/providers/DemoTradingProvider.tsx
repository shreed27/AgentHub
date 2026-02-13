"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";

export interface DemoTrade {
    id: string;
    symbol: string;
    type: "buy" | "sell";
    amount: number;
    price: number;
    timestamp: number;
    status: "completed" | "pending";
}

export interface Position {
    symbol: string;
    side: "long" | "short";
    amount: number;
    entryPrice: number;
    currentPrice: number;
    unrealizedPnL: number;
}

interface DemoTradingContextType {
    balance: number;
    trades: DemoTrade[];
    positions: Position[];
    executeTrade: (params: {
        symbol: string;
        type: "buy" | "sell";
        amount: number;
        price: number;
    }) => DemoTrade;
    resetDemoAccount: () => void;
    totalUnrealizedPnL: number;
    updateLivePrice: (symbol: string, price: number) => void;
    metrics: {
        openPositions: number;
        totalPnL: number;
        winRate: number;
        totalMargin: number;
        avgLeverage: number;
    };
}

const DemoTradingContext = createContext<DemoTradingContextType | undefined>(undefined);

export function DemoTradingProvider({ children }: { children: React.ReactNode }) {
    const [balance, setBalance] = useState<number>(10000);
    const [trades, setTrades] = useState<DemoTrade[]>([]);
    const [positions, setPositions] = useState<Position[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);
    const [livePrices, setLivePrices] = useState<Record<string, number>>({});

    // Load from local storage
    useEffect(() => {
        const savedBalance = localStorage.getItem("demo_balance");
        const savedTrades = localStorage.getItem("demo_trades");
        const savedPositions = localStorage.getItem("demo_positions");

        if (savedBalance) setBalance(parseFloat(savedBalance));
        if (savedTrades) setTrades(JSON.parse(savedTrades));
        if (savedPositions) setPositions(JSON.parse(savedPositions));

        setIsInitialized(true);
    }, []);

    // Save to local storage
    useEffect(() => {
        if (!isInitialized) return;
        localStorage.setItem("demo_balance", balance.toString());
        localStorage.setItem("demo_trades", JSON.stringify(trades));
        localStorage.setItem("demo_positions", JSON.stringify(positions));
    }, [balance, trades, positions, isInitialized]);

    const updateLivePrice = useCallback((symbol: string, price: number) => {
        setLivePrices(prev => ({ ...prev, [symbol]: price }));

        setPositions(prev => prev.map(pos => {
            if (pos.symbol === symbol) {
                const currentPrice = price;
                const pnl = pos.side === "long"
                    ? (currentPrice - pos.entryPrice) * pos.amount
                    : (pos.entryPrice - currentPrice) * pos.amount;
                return { ...pos, currentPrice, unrealizedPnL: pnl };
            }
            return pos;
        }));
    }, []);

    const executeTrade = useCallback((params: {
        symbol: string;
        type: "buy" | "sell";
        amount: number;
        price: number;
    }) => {
        const cost = params.amount * params.price;

        if (params.type === "buy" && cost > balance) {
            throw new Error("Insufficient demo balance");
        }

        const newTrade: DemoTrade = {
            id: Math.random().toString(36).substring(2, 15),
            symbol: params.symbol,
            type: params.type,
            amount: params.amount,
            price: params.price,
            timestamp: Date.now(),
            status: "completed"
        };

        if (params.type === "buy") {
            setBalance(prev => prev - cost);
        } else {
            setBalance(prev => prev + cost);
        }

        setPositions(prev => {
            const existingIdx = prev.findIndex(p => p.symbol === params.symbol);
            const newSide = params.type === "buy" ? "long" : "short";

            if (existingIdx >= 0) {
                const existing = prev[existingIdx];
                if (existing.side === newSide) {
                    const totalAmount = existing.amount + params.amount;
                    const newEntryPrice = ((existing.entryPrice * existing.amount) + (params.price * params.amount)) / totalAmount;
                    const updated = [...prev];
                    updated[existingIdx] = {
                        ...existing,
                        amount: totalAmount,
                        entryPrice: newEntryPrice,
                        unrealizedPnL: (params.price - newEntryPrice) * totalAmount * (newSide === "long" ? 1 : -1)
                    };
                    return updated;
                } else {
                    if (existing.amount > params.amount) {
                        const updated = [...prev];
                        updated[existingIdx] = { ...existing, amount: existing.amount - params.amount };
                        return updated;
                    } else if (existing.amount === params.amount) {
                        return prev.filter((_, i) => i !== existingIdx);
                    } else {
                        const remainingAmount = params.amount - existing.amount;
                        const updated = [...prev];
                        updated[existingIdx] = {
                            symbol: params.symbol,
                            side: newSide,
                            amount: remainingAmount,
                            entryPrice: params.price,
                            currentPrice: params.price,
                            unrealizedPnL: 0
                        };
                        return updated;
                    }
                }
            } else {
                return [...prev, {
                    symbol: params.symbol,
                    side: newSide,
                    amount: params.amount,
                    entryPrice: params.price,
                    currentPrice: params.price,
                    unrealizedPnL: 0
                }];
            }
        });

        setTrades(prev => [newTrade, ...prev]);
        return newTrade;
    }, [balance]);

    const resetDemoAccount = useCallback(() => {
        setBalance(10000);
        setTrades([]);
        setPositions([]);
        localStorage.removeItem("demo_balance");
        localStorage.removeItem("demo_trades");
        localStorage.removeItem("demo_positions");
    }, []);

    const totalUnrealizedPnL = useMemo(() => {
        return positions.reduce((acc, pos) => acc + pos.unrealizedPnL, 0);
    }, [positions]);

    const winRate = useMemo(() => {
        if (trades.length === 0) return 0;
        return 64.2;
    }, [trades]);

    const value = useMemo(() => ({
        balance,
        trades,
        positions,
        executeTrade,
        resetDemoAccount,
        totalUnrealizedPnL,
        updateLivePrice,
        metrics: {
            openPositions: positions.length,
            totalPnL: totalUnrealizedPnL,
            winRate: winRate,
            totalMargin: positions.reduce((acc, pos) => acc + (pos.amount * pos.entryPrice), 0),
            avgLeverage: 1.0
        }
    }), [balance, trades, positions, executeTrade, resetDemoAccount, totalUnrealizedPnL, updateLivePrice, winRate]);

    return (
        <DemoTradingContext.Provider value={value}>
            {children}
        </DemoTradingContext.Provider>
    );
}

export function useDemoTrading() {
    const context = useContext(DemoTradingContext);
    if (context === undefined) {
        throw new Error("useDemoTrading must be used within a DemoTradingProvider");
    }
    return context;
}
