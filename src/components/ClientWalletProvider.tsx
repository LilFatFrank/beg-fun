"use client";

import { WalletProvider } from "./WalletProvider";

export function ClientWalletProvider({ children }: { children: React.ReactNode }) {
  return <WalletProvider>{children}</WalletProvider>;
}
