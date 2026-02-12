"use client";

import { ThemeProvider as NextThemesProvider, type ThemeProviderProps as NextThemesProviderProps } from "next-themes";
import * as React from "react";

type ThemeProviderProps = NextThemesProviderProps & {
    children: React.ReactNode;
};

export function ThemeProvider({
    children,
    ...props
}: ThemeProviderProps) {
    return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

// Simple passthrough - wallet connection will be added via WalletProviderWrapper
export function Providers({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
