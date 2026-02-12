"use client";

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface CyberButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'premium';
    isLoading?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

export const CyberButton = forwardRef<HTMLButtonElement, CyberButtonProps>(
    ({ className, variant = 'primary', size = 'md', isLoading, children, ...props }, ref) => {

        const sizeClasses = {
            sm: "px-5 py-2 text-[12px]",
            md: "px-7 py-3 text-[14px]",
            lg: "px-9 py-4 text-[16px]",
        };

        const variantClasses = {
            primary: "bg-white text-black hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]",
            secondary: "bg-white/[0.05] text-white hover:bg-white/[0.1] border border-white/[0.08]",
            outline: "bg-transparent text-white border border-white/[0.15] hover:border-white/[0.3] hover:bg-white/[0.02]",
            ghost: "bg-transparent text-[#a1a1aa] hover:text-white hover:bg-white/[0.05]",
            danger: "bg-rose-500 text-white hover:bg-rose-600 shadow-[0_4px_20px_rgba(244,63,94,0.2)]",
            premium: "bg-accent-primary text-white hover:shadow-[0_0_30px_var(--color-accent-primary-glow)]",
        };

        return (
            <motion.button
                ref={ref}
                className={cn(
                    "relative overflow-hidden inline-flex items-center justify-center font-bold rounded-2xl transition-all duration-400 tracking-[-0.02em] active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
                    sizeClasses[size],
                    variantClasses[variant],
                    className
                )}
                whileTap={{ scale: 0.96 }}
                {...props}
            >
                {/* Content */}
                <span className="relative z-10 flex items-center justify-center gap-2.5">
                    {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {children}
                </span>

                {/* Glass Shimmer Effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
                    <div className="absolute inset-0 shimmer opacity-20" />
                </div>

                {/* Refined Shine for Solid Variants */}
                {(variant === 'primary' || variant === 'premium' || variant === 'danger') && (
                    <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-[30deg] pointer-events-none"
                        initial={{ left: '-100%' }}
                        whileHover={{ left: '100%' }}
                        transition={{ duration: 1, ease: "easeInOut" }}
                    />
                )}
            </motion.button>
        );
    }
);

CyberButton.displayName = 'CyberButton';
