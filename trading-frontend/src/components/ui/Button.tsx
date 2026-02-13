import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "ghost" | "danger" | "success" | "outline";
    size?: "sm" | "md" | "lg";
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    fullWidth?: boolean;
    glow?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            className,
            variant = "primary",
            size = "md",
            isLoading = false,
            leftIcon,
            rightIcon,
            fullWidth = false,
            glow = false,
            children,
            disabled,
            ...props
        },
        ref
    ) => {
        const baseStyles =
            "relative inline-flex items-center justify-center font-bold tracking-tight transition-all duration-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#050505] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";

        const variants = {
            primary:
                "bg-[#ededed] text-[#050505] hover:bg-white hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] border border-transparent",
            secondary:
                "bg-[#1a1a1a] text-[#ededed] border border-[#333] hover:bg-[#252525] hover:border-[#444]",
            ghost:
                "bg-transparent text-[#a1a1aa] hover:text-[#ededed] hover:bg-white/[0.05]",
            danger:
                "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/40",
            success:
                "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/40",
            outline:
                "bg-transparent border border-[#333] text-[#ededed] hover:border-[#666] hover:bg-white/[0.02]",
        };

        const sizes = {
            sm: "h-8 px-3 text-xs",
            md: "h-10 px-5 text-sm",
            lg: "h-12 px-7 text-base",
        };

        return (
            <button
                ref={ref}
                className={cn(
                    baseStyles,
                    variants[variant],
                    sizes[size],
                    fullWidth ? "w-full" : "",
                    glow && variant === "primary" && "shadow-[0_0_15px_rgba(255,255,255,0.15)]",
                    className
                )}
                disabled={isLoading || disabled}
                {...props}
            >
                {isLoading && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {!isLoading && leftIcon && (
                    <span className="mr-2">{leftIcon}</span>
                )}
                {children}
                {!isLoading && rightIcon && (
                    <span className="ml-2">{rightIcon}</span>
                )}
            </button>
        );
    }
);

Button.displayName = "Button";
