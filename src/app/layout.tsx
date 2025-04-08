import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@solana/wallet-adapter-react-ui/styles.css";
import { Toaster } from "sonner";
import { ClientWalletProvider } from "@/components/ClientWalletProvider";
import React from "react";
import AppHeader from "@/components/Header";
import LiveChat from "@/components/LiveChat";
import AudioOptions from "@/components/AudioOptions";
import Footer from "@/components/Footer";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
import { UserProvider } from "@/contexts/UserContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BegsFun",
  description: "please send me 1 sol bro",
  icons: {
    icon: [
      {
        rel: "icon",
        url: "/assets/logo-icon-fav.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        rel: "shortcut icon",
        url: "/assets/logo-icon-fav.svg",
        type: "image/svg+xml",
      },
      {
        rel: "apple-touch-icon",
        url: "/assets/logo-icon-fav.svg",
        type: "image/svg+xml",
      },
    ],
    shortcut: [
      {
        url: "/assets/logo-icon-fav.svg",
        type: "image/svg+xml",
      },
    ],
    apple: [
      {
        url: "/assets/logo-icon-fav.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
    other: [
      {
        rel: "mask-icon",
        url: "/assets/logo-icon-fav.svg",
      },
    ],
  },
  openGraph: {
    title: "BegsFun",
    description: "please send me 1 sol bro",
    url: "https://www.begsfun.xyz",
    siteName: "BegsFun",
    images: [
      {
        url: "https://www.begsfun.xyz/assets/opengraph-image.jpg",
        alt: "BegsFun - please send me 1 sol bro",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  metadataBase: new URL("https://www.begsfun.xyz"),
  alternates: {
    canonical: "https://www.begsfun.xyz",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script src="https://terminal.jup.ag/main-v3.js" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#F9F9F9]`}
      >
        <Toaster
          position="bottom-center"
          duration={2500}
          style={{
            fontFamily: "ComicSans",
          }}
        />
        <img
          src="/assets/grid-pattern-bg.jpg"
          alt="bg"
          className="w-full h-full fixed top-0 left-0 right-0 bottom-0 z-[-1] object-cove opacity-[45%] hidden lg:block"
        />
        <ClientWalletProvider>
          <WebSocketProvider>
            <UserProvider>
              <div className="container h-[calc(100vh-40px)] mx-auto flex flex-col">
                <div className="grow flex flex-col w-full py-[20px] md:py-[40px] max-md:px-[20px] flex-1 h-full">
                  <AppHeader />
                  <div className="w-full flex flex-1 h-full gap-4 md:gap-6 lg:gap-[40px] lg:py-4 lg:h-[calc(100%-60px)]">
                    <div className="w-full lg:w-[75%] flex flex-col">
                      {children}
                    </div>
                    {/* Right section - hidden on mobile */}
                    <div className="hidden lg:block w-[25%]">
                      <div className="flex-grow mt-6 flex flex-col gap-4 w-full h-full">
                        <LiveChat />
                        <AudioOptions />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <Footer />
            </UserProvider>
          </WebSocketProvider>
        </ClientWalletProvider>
      </body>
    </html>
  );
}
