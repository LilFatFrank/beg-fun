import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@solana/wallet-adapter-react-ui/styles.css";
import { Toaster } from "sonner";
import { ClientWalletProvider } from "@/components/ClientWalletProvider";

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
    icon: "/assets/logo-icon.svg",
  },
  metadataBase: new URL("https://begsfun.xyz"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
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
          src="/assets/bg-image.jpg"
          alt="bg"
          className="fixed max-md:h-screen md:top-1/2 md:left-1/2 md:translate-x-[-50%] md:translate-y-[-50%] z-[-1] object-cover"
        />
        <ClientWalletProvider>{children}</ClientWalletProvider>
      </body>
    </html>
  );
}
