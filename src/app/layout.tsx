import type { Metadata } from "next";
import { Inter, Playfair_Display, Noto_Sans_Telugu } from "next/font/google";
import Footer from "./components/Footer";
import Header from "./components/Header";
import { ToastProvider } from "./components/Toast";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const notoTelugu = Noto_Sans_Telugu({
  variable: "--font-telugu",
  subsets: ["telugu"],
});

export const metadata: Metadata = {
  title: "Darbha Babu Rao",
  description: "Personal website of Darbha Babu Rao — Educator, Scholar, and Former Vice-Principal of The Bapatla College of Arts & Sciences.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${playfair.variable} ${notoTelugu.variable} flex min-h-screen flex-col`}>
        <ToastProvider>
          <Header />
          {children}
          <Footer />
        </ToastProvider>
      </body>
    </html>
  );
}
