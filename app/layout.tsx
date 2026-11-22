import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Newsreader } from "next/font/google";
import { AppProviders } from "@/components/app-providers";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import "./globals.css";

// UI and body: Instrument Sans (open counters, readable at 14–16px, tabular figures).
const instrument = Instrument_Sans({ variable: "--font-instrument", subsets: ["latin"] });
// Headings: Newsreader, the serif from the original design (D13), optical sizes on.
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "LendLoop",
  description: "Borrow what you need. Lend what you don't.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F3EC" },
    { media: "(prefers-color-scheme: dark)", color: "#11151C" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // next-themes sets the theme class on <html> before hydration.
    <html lang="en" className={`${instrument.variable} ${newsreader.variable}`} suppressHydrationWarning>
      <body>
        <ClerkProvider>
          <ConvexClientProvider>
            <AppProviders>{children}</AppProviders>
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
