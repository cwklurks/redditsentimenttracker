import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Reddit Stock Sentiment Tracker",
  description: "Monitor stock discussions and sentiment from r/wallstreetbets",
  keywords: ["stocks", "sentiment", "reddit", "wallstreetbets", "trading", "analysis"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider 
          attribute="class" 
          defaultTheme="dark" 
          enableSystem={false}
          disableTransitionOnChange
        >
          <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
            {children}
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
