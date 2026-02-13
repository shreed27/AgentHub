import React from 'react';
import { cn } from '@/lib/utils';
import { Terminal, Activity, Shield, Cpu, Zap, Globe, Lock } from 'lucide-react';

interface TechHeaderProps {
    title: string;
    subtitle: string;
    breadcrumb?: string;
    systemStatus?: 'active' | 'warning' | 'offline';
    version?: string;
    metrics?: {
        label: string;
        value: string;
        status?: 'good' | 'neutral' | 'bad';
    }[];
}

export function TechHeader({
    title,
    subtitle,
    breadcrumb = 'ROOT',
    systemStatus = 'active',
    version = 'v2.4.0',
    metrics
}: TechHeaderProps) {
    return (
        <div className="w-full border-b border-white/10 bg-[#050505] pb-6 mb-8 relative overflow-hidden">
            {/* Background Grid Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)] pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6 pt-8 px-1">
                <div className="space-y-4">
                    {/* Breadcrumbs / Meta */}
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "w-2 h-2 rounded-sm animate-pulse",
                            systemStatus === 'active' ? "bg-emerald-500" :
                                systemStatus === 'warning' ? "bg-amber-500" : "bg-rose-500"
                        )} />
                        <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                            <span className="text-emerald-500 font-bold">SYS_ACTIVE</span>
                            <span>//</span>
                            <span>{breadcrumb}</span>
                            <span>//</span>
                            <span>{version}</span>
                        </div>
                    </div>

                    {/* Main Title */}
                    <div>
                        <h1 className="text-4xl md:text-5xl font-bold font-mono text-white tracking-tighter uppercase mb-2">
                            {title}
                        </h1>
                        <p className="text-sm font-mono text-zinc-400 max-w-2xl leading-relaxed border-l-2 border-white/10 pl-4 py-1">
                            {subtitle}
                        </p>
                    </div>
                </div>

                {/* Right Side Metrics/Controls */}
                {metrics && (
                    <div className="flex items-center gap-8">
                        {metrics.map((metric, i) => (
                            <div key={i} className="flex flex-col items-end">
                                <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-1">{metric.label}</span>
                                <div className="flex items-center gap-2">
                                    <span className={cn(
                                        "text-lg font-mono font-bold",
                                        metric.status === 'good' ? "text-emerald-500" :
                                            metric.status === 'bad' ? "text-rose-500" : "text-white"
                                    )}>
                                        {metric.value}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Decorative Bottom Line with Ticks */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-white/10 flex justify-between">
                {[...Array(20)].map((_, i) => (
                    <div key={i} className="w-px h-1 bg-white/20" />
                ))}
            </div>
        </div>
    );
}

// Sub-components can be exported if needed
export function TechSectionHeader({ title, icon: Icon = Terminal }: { title: string, icon?: any }) {
    return (
        <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-2">
            <Icon className="w-4 h-4 text-emerald-500" />
            <h3 className="text-xs font-mono font-bold text-white tracking-widest uppercase">{title}</h3>
        </div>
    );
}
