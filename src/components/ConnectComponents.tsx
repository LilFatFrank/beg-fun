import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export const ConnectButton = ({ isMobile = false }) => (
  <>
    <WalletMultiButton
      style={{
        background: "black",
        cursor: "pointer",
        padding: isMobile ? "2px 8px" : "4px 16px",
        width: "fit",
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        color: "#FFD44F",
        fontWeight: 800,
        height: isMobile ? "24px" : "40px",
      }}
    >
      <img
        src="/assets/solana-yellow-icon.svg"
        alt="solana"
        className={isMobile ? "w-3 h-3" : "w-6 h-6"}
      />
      <span
        className={`font-[ComicSans] ${
          isMobile ? "text-[9px]" : "text-[16px]"
        } text-[#FFD44F] font-bold block whitespace-nowrap w-full overflow-hidden text-ellipsis`}
      >
        Connect Wallet
      </span>
    </WalletMultiButton>
  </>
);

export const ConnectedState = ({
  isMobile = false,
}: {
  isMobile?: boolean;
}) => {
  const { publicKey, disconnect } = useWallet();

  return (
    <>
      <div
        className={`cursor-pointer rounded-full h-full ${
          isMobile ? "px-2 py-[2px]" : "px-4 py-1"
        } border border-black flex items-center gap-2 bg-[#FFD44F] shadow-[inset_0px_4px_8px_0px_rgba(0,0,0,0.25)]`}
        onClick={disconnect}
      >
        <img
          src="/assets/solana-brown-icon.svg"
          alt="solana"
          className={"w-3 h-3 lg:w-6 lg:h-6"}
        />
        <p
          className={`text-[#5D3014] text-[9px] lg:text-[16px] overflow-hidden`}
        >
          {publicKey?.toBase58()?.slice(0, 4)}...
          {publicKey?.toBase58()?.slice(-4)}
        </p>
      </div>
    </>
  );
};
