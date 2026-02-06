"use client";

import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis } from "recharts";
import { Wallet, TrendingUp, TrendingDown, RefreshCcw, DollarSign, PieChart as PieChartIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const assetData = [
    { name: "SOL", value: 45, color: "#9945FF" },
    { name: "USDC", value: 30, color: "#2775CA" },
    { name: "BTC", value: 15, color: "#F7931A" },
    { name: "ETH", value: 10, color: "#627EEA" },
];

const performanceData = [
    { name: "Mon", value: 10000 },
    { name: "Tue", value: 10500 },
    { name: "Wed", value: 10200 },
    { name: "Thu", value: 11800 },
    { name: "Fri", value: 11500 },
    { name: "Sat", value: 12500 },
    { name: "Sun", value: 13200 },
];

const transactions = [
    { id: 1, type: "Buy", asset: "SOL", amount: 150, price: 142.5, time: "2 min ago", profit: 0 },
    { id: 2, type: "Sell", asset: "BTC", amount: 0.5, price: 42000, time: "15 min ago", profit: 250 },
    { id: 3, type: "Buy", asset: "ETH", amount: 5, price: 2800, time: "1 hour ago", profit: 0 },
    { id: 4, type: "Sell", asset: "SOL", amount: 100, price: 145.2, time: "2 hours ago", profit: 120 },
];

export default function PortfolioPage() {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Header */}
            <header className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-1">Portfolio & Assets</h1>
                    <p className="text-muted-foreground">Manage capital allocation and performance analysis.</p>
                </div>
                <div className="flex gap-3">
                    <button className="h-10 px-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-2 text-sm font-medium transition-colors">
                        <RefreshCcw className="w-4 h-4" /> Sync Wallets
                    </button>
                    <button className="h-10 px-4 rounded-lg bg-green-600 hover:bg-green-500 text-white flex items-center gap-2 text-sm font-medium transition-colors shadow-lg shadow-green-900/20">
                        <DollarSign className="w-4 h-4" /> Deposit
                    </button>
                </div>
            </header>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Total Balance Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="lg:col-span-2 p-6 rounded-2xl border border-white/5 bg-gradient-to-br from-blue-900/10 to-purple-900/10 backdrop-blur-md relative overflow-hidden"
                >
                    <div className="relative z-10 flex justify-between items-start mb-6">
                        <div>
                            <p className="text-muted-foreground font-medium mb-1">Total Balance Estimate</p>
                            <h2 className="text-4xl font-bold tracking-tight text-white">$42,593.00</h2>
                            <div className="flex items-center gap-2 mt-2 text-green-400 font-medium">
                                <TrendingUp className="w-4 h-4" />
                                +12.5% ($4,500) <span className="text-muted-foreground text-sm font-normal">vs last week</span>
                            </div>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                            <Wallet className="w-6 h-6 text-white" />
                        </div>
                    </div>

                    {/* Chart */}
                    <div className="h-64 w-full -ml-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={performanceData}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }}
                                    labelStyle={{ color: '#888' }}
                                />
                                <Area type="monotone" dataKey="value" stroke="#8884d8" fillOpacity={1} fill="url(#colorValue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Allocation Donut */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-md flex flex-col"
                >
                    <h3 className="font-semibold mb-6 flex items-center gap-2">
                        <PieChartIcon className="w-4 h-4 text-purple-400" /> Asset Allocation
                    </h3>
                    <div className="flex-1 min-h-[200px] relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={assetData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {assetData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(0,0,0,0.2)" />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '8px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Legend */}
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                            <div className="text-center">
                                <div className="text-xs text-muted-foreground">Top Asset</div>
                                <div className="font-bold text-lg text-white">SOL</div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3 mt-4">
                        {assetData.map((asset) => (
                            <div key={asset.name} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: asset.color }} />
                                    <span className="text-muted-foreground">{asset.name}</span>
                                </div>
                                <span className="font-medium text-white">{asset.value}%</span>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Recent Transactions Table */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="lg:col-span-3 p-6 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-md"
                >
                    <h3 className="font-semibold mb-6">Recent Transactions</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-muted-foreground uppercase border-b border-white/5">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Type</th>
                                    <th className="px-4 py-3 font-medium">Asset</th>
                                    <th className="px-4 py-3 font-medium">Amount</th>
                                    <th className="px-4 py-3 font-medium">Price</th>
                                    <th className="px-4 py-3 font-medium">PnL</th>
                                    <th className="px-4 py-3 font-medium text-right">Time</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {transactions.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-4 py-3">
                                            <span className={cn(
                                                "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                                tx.type === 'Buy' ? "bg-blue-500/10 text-blue-400" : "bg-orange-500/10 text-orange-400"
                                            )}>
                                                {tx.type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-medium text-white">{tx.asset}</td>
                                        <td className="px-4 py-3 text-muted-foreground">{tx.amount}</td>
                                        <td className="px-4 py-3 text-muted-foreground">${tx.price.toLocaleString()}</td>
                                        <td className="px-4 py-3">
                                            {tx.profit > 0 ? (
                                                <span className="text-green-400 flex items-center gap-1">
                                                    <TrendingUp className="w-3 h-3" /> +${tx.profit}
                                                </span>
                                            ) : (
                                                <span className="text-gray-500">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right text-muted-foreground text-xs">{tx.time}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="mt-4 text-center">
                            <button className="text-xs text-muted-foreground hover:text-white transition-colors">
                                View All Activity →
                            </button>
                        </div>
                    </div>
                </motion.div>

            </div>
        </div>
    );
}
