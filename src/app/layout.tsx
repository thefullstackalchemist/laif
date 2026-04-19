import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";
import FaviconSwitcher from "@/components/FaviconSwitcher";
import NotificationCenter from "@/components/NotificationCenter";
import AppShell from "@/components/layout/AppShell";

const nunito = localFont({
  src: [
    { path: '../../public/fonts/Nunito-VariableFont_wght.ttf', style: 'normal' },
    { path: '../../public/fonts/Nunito-Italic-VariableFont_wght.ttf', style: 'italic' },
  ],
  variable: "--font-nunito",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PIM — Personal Intelligent Manager",
  description: "Manage events, tasks, reminders and notes — all in one premium workspace.",
  icons: {
    icon: '/logo_new.png',
    apple: '/logo_new.png',
    shortcut: '/logo_new.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PIM',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={nunito.variable} data-theme="light">
      <head>
        <meta name="theme-color" content="#f4f6fb" />
      </head>
      <body>
        <ThemeProvider>
          <FaviconSwitcher />
          <AppShell>{children}</AppShell>
          <NotificationCenter />
        </ThemeProvider>
      </body>
    </html>
  );
}
