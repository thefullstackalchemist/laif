import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";
import FaviconSwitcher from "@/components/FaviconSwitcher";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "laif — Your personal assistant",
  description: "Manage events, tasks, reminders and notes — all in one premium workspace.",
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'laif',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} data-theme="dark">
      <body>
        <ThemeProvider>
          <FaviconSwitcher />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
