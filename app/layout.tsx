import type { Metadata } from "next";
import "./globals.css";
import { ConditionalNavbar } from "@/components/layout/conditional-navbar";
import { ErrorBoundary } from "@/components/error-boundary";
import { SearchProvider } from "@/lib/contexts/search-context";

export const metadata: Metadata = {
  title: "Mainstream | Design Collaboration",
  description: "Internal tool for design teams to share work.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className="antialiased bg-black text-white min-h-screen flex flex-col font-sans"
      >
        <SearchProvider>
          {/* Skip to main content link for accessibility */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:rounded-full focus:font-medium"
          >
            Skip to main content
          </a>
          
          <ConditionalNavbar />
          
          <ErrorBoundary>
            <main
              id="main-content"
              className="flex-1 w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6"
            >
              {children}
            </main>
          </ErrorBoundary>
        </SearchProvider>
      </body>
    </html>
  );
}
