import type { Metadata } from "next";
import { Geist, Geist_Mono, Orbitron, Exo_2 } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers";
import { Toaster } from "react-hot-toast";
import { ClientLayout } from "@/components/ClientLayout";
import { BackgroundGrid } from "@/components/ui/BackgroundGrid";
import DemoBanner from "@/components/DemoBanner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
});

const exo2 = Exo_2({
  variable: "--font-exo2",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Trading Orchestrator",
  description: "Autonomous Trading Agent Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${orbitron.variable} ${exo2.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <DemoBanner />
          <BackgroundGrid />
          <ClientLayout>
            {children}
          </ClientLayout>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#18181b',
                color: '#fafafa',
                border: '1px solid rgba(255,255,255,0.1)',
              },
              success: {
                iconTheme: {
                  primary: '#22c55e',
                  secondary: '#fafafa',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fafafa',
                },
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
