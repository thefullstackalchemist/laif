import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";
import FaviconSwitcher from "@/components/FaviconSwitcher";
import NotificationCenter from "@/components/NotificationCenter";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PIM — Personal Intelligent Manager",
  description: "Manage events, tasks, reminders and notes — all in one premium workspace.",
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'PIM',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} data-theme="dark">
      <body>
        <ThemeProvider>
          <FaviconSwitcher />
          {children}
          <NotificationCenter />
        </ThemeProvider>
      </body>
    </html>
  );
}
