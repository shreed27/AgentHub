"use client";

import { motion } from "framer-motion";
import { TrendingUp, Copy, ExternalLink, Star } from "lucide-react";

interface TokenRowProps {
    rank: number;
    symbol: string;
    name: string;
    price: number;
    change24h: number;
    volume: string;
    mcap: string;
    liquidity: string;
}

export function TokenRow({ rank, symbol, name, price, change24h, volume, mcap, liquidity }: TokenRowProps) {
    const isPositive = change24h >= 0;

    return (
        <motion.tr
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group cursor-pointer text-xs"
        >
            <td className="px-4 py-3 text-muted-foreground w-8 text-center">{rank}</td>
            <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-[8px] font-bold text-white">
                        {symbol[0]}
                    </div>
                    <div>
                        <div className="font-bold text-white flex items-center gap-1.5">
                            {symbol} <span className="text-muted-foreground font-normal opacity-50 text-[10px]">{name}</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Copy className="w-3 h-3 text-muted-foreground hover:text-white" />
                            <Star className="w-3 h-3 text-muted-foreground hover:text-yellow-400" />
                        </div>
                    </div>
                </div>
            </td>
            <td className="px-4 py-3 font-mono text-white text-right">${price.toFixed(6)}</td>
            <td className={cn("px-4 py-3 font-mono text-right font-bold", isPositive ? "text-green-400" : "text-red-400")}>
                {isPositive ? "+" : ""}{change24h}%
            </td>
            <td className="px-4 py-3 text-right text-muted-foreground">{volume}</td>
            <td className="px-4 py-3 text-right text-muted-foreground hidden md:table-cell">{liquidity}</td>
            <td className="px-4 py-3 text-right text-white font-medium hidden md:table-cell">{mcap}</td>
        </motion.tr>
    );
}

import { cn } from "@/lib/utils";
