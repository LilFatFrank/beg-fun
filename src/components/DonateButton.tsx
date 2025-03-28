"use client";
import {
  detectSolanaAddress,
  formatSolAmount,
} from "@/utils";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import Modal from "./Modal";
import DonateComponent from "./DonateComponent";

const DonateButton = ({
  handleDonate,
  donatingMessageId,
  msg,
}: {
  handleDonate: (
    recipientAddress: string,
    amount: string,
    messageId: string
  ) => void;
  donatingMessageId: string | null;
  msg: {
    _id: string;
    solAmount: string;
    walletAddress: string;
    fillAmount: string;
  };
}) => {
  const { publicKey } = useWallet();
  const spanRef = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [donateModal, setDonateModal] = useState<{
    isOpen: boolean;
    recipientAddress: string;
    solAmount: string;
    messageId: string;
    fillAmount: string;
  }>({
    isOpen: false,
    recipientAddress: "",
    solAmount: "",
    messageId: "",
    fillAmount: "",
  });

  const handleDonateClick = (
    recipientAddress: string,
    amount: string,
    messageId: string,
    fillAmount: string
  ) => {
    if (!publicKey) {
      toast.info("Connect wallet to donate!");
      return;
    }

    // Validate recipient address is a valid base58 string
    if (!detectSolanaAddress(recipientAddress)) {
      toast.error("Invalid recipient wallet address");
      return;
    }

    setDonateModal({
      isOpen: true,
      recipientAddress,
      solAmount: amount,
      messageId,
      fillAmount,
    });
  };

  const handleDonateSubmit = async (amount: string) => {
    await handleDonate(
      donateModal.recipientAddress,
      amount,
      donateModal.messageId
    );
    setDonateModal((prev) => ({ ...prev, isOpen: false }));
  };

  useEffect(() => {
    const adjustFontSize = () => {
      if (!spanRef.current || !containerRef.current) return;

      const span = spanRef.current;
      const container = containerRef.current;
      const containerWidth = container.offsetWidth - 40; // Account for padding and icon
      const maxFontSize = 14;
      let fontSize = maxFontSize;

      // Reset font size to max
      span.style.fontSize = `${maxFontSize}px`;

      // If content is wider than container, reduce font size
      while (span.offsetWidth > containerWidth && fontSize > 8) {
        fontSize--;
        span.style.fontSize = `${fontSize}px`;
      }
    };

    // Initial adjustment
    adjustFontSize();

    // Create ResizeObserver to handle container size changes
    const resizeObserver = new ResizeObserver(adjustFontSize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Cleanup
    return () => {
      resizeObserver.disconnect();
    };
  }, [msg.fillAmount, msg.solAmount]); // Re-run when amounts change

  return (
    <>
      <div className="w-full flex items-stretch gap-2 h-full">
        <div
          ref={containerRef}
          className="w-[80px] flex-shrink-0 h-auto flex items-center justify-center gap-1 px-1 rounded-[8px] border bg-[#FFD44F]"
          style={{ borderColor: "rgba(93, 48, 20, 40%)" }}
        >
          <img
            src="/assets/solana-brown-icon.svg"
            alt="solana"
            className="w-4 h-4"
          />
          <span
            ref={spanRef}
            className="font-bold text-[#5D3014] whitespace-nowrap"
            style={{ fontSize: "14px" }}
          >
            {formatSolAmount(msg.fillAmount)} / {formatSolAmount(msg.solAmount)}
          </span>
        </div>
        <button
          onClick={() =>
            handleDonateClick(
              msg.walletAddress,
              msg.solAmount,
              msg._id,
              msg.fillAmount
            )
          }
          disabled={donatingMessageId === msg._id}
          className={`grow w-full border-[#000000] bg-gradient-to-r from-[#000000] to-[#454545] cursor-pointer rounded-[8px] disabled:opacity-70 border lg:h-[32px]`}
          style={{
            filter: "drop-shadow(0px 4px 8px rgba(93, 48, 20, 0.4))",
          }}
        >
          {donatingMessageId === msg._id ? (
            <div className="w-5 h-5 border-2 border-[#FFD44F] border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <div className="lg:basis-1/2 basis-2/3 flex items-center justify-center gap-2">
                <span className="text-[16px]">🫳</span>
                <span className="font-bold text-[#FFD44F] text-[14px]">
                  Donate
                </span>
              </div>
            </>
          )}
        </button>
      </div>
      <Modal
        isOpen={donateModal.isOpen}
        onClose={() => setDonateModal((prev) => ({ ...prev, isOpen: false }))}
        preventClose={!!donatingMessageId}
        style={{ background: "#ffffff", maxWidth: "360px" }}
      >
        <DonateComponent
          solAmount={donateModal.solAmount}
          fillAmount={donateModal.fillAmount}
          onDonate={handleDonateSubmit}
          isDonating={!!donatingMessageId}
        />
      </Modal>
    </>
  );
};

export default DonateButton;
