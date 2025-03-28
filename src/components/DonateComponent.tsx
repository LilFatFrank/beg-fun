import { formatSolAmount, validateSolAmount } from "@/utils";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const DonateComponent = ({
  solAmount,
  fillAmount,
  onDonate,
  isDonating,
  inputBackground = 'bg-white'
}: {
  solAmount: string;
  fillAmount: string;
  onDonate: (amount: string) => void;
  isDonating: boolean;
  inputBackground?: string;
}) => {
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const connection = new Connection(process.env.NEXT_PUBLIC_RPC!);

  const handleDonateClick = useCallback(() => {
    if (!amount) {
      toast.error("Please enter donation amount!");
      return;
    }
    onDonate(amount);
  }, [amount]);

  useEffect(() => {
    const fetchBalance = async () => {
      if (publicKey) {
        const balance = await connection.getBalance(publicKey);
        setBalance(balance / LAMPORTS_PER_SOL);
      }
    };
    fetchBalance();
  }, [publicKey]);

  // Add handler for amount changes
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const validatedAmount = validateSolAmount(e.target.value);
    setAmount(validatedAmount);
  };

  return (
    <div className="flex flex-col w-full">
      <p className="text-[16px] text-[#5D3014] font-bold text-center mb-4">
        MAKE A DONATION
      </p>
      <hr className="w-full h-0 border-[0.5px] border-[#5D3014] opacity-100 mb-6" />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img
            src="/assets/solana-brown-icon.svg"
            alt="solana"
            className="w-3 h-3"
          />
          <span className="text-[12px] text-[#5D3014]">{solAmount} sol</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-[#8F95B2]">BALANCE</span>
          <div className="flex items-center gap-1">
            <img
              src="/assets/solana-black-icon.svg"
              alt="solana"
              className="w-3 h-3"
            />
            <span className="text-[12px] text-[#000]">
              {formatSolAmount(balance || 0) || "0.00"} SOL
            </span>
          </div>
        </div>
      </div>
      <div className="relative w-full h-[24px] bg-[#FFD44F] rounded-[200px] overflow-hidden border border-[#FF9933] mt-2">
        <div
          className="absolute top-0 left-0 h-full transition-all duration-300 rounded-[200px]"
          style={{
            width: `${Math.min(
              100,
              (Number(fillAmount) / Number(solAmount)) * 100
            )}%`,
            background: "linear-gradient(to right, #009A49, #29F188)",
          }}
        />
        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-end">
          <div className="relative z-10 mr-[12px] text-[12px] font-medium">
            <span
              className="text-[#000000]"
              style={{
                color:
                  (Number(fillAmount) / Number(solAmount)) * 100 >= 95
                    ? "#FFFFFF"
                    : "#000000",
              }}
            >
              {formatSolAmount(fillAmount)} / {solAmount} sol
            </span>
          </div>
        </div>
      </div>
      <div className="w-[60%] bg-gradient-to-r from-[#000000] to-[#ffffff] h-[1px] mt-[12px] mb-[16px]" />
      <div className={`w-full rounded-[8px] ${inputBackground}`}>
        <div className="flex items-center gap-2 mb-1">
          <img
            src="/assets/solana-black-icon.svg"
            alt="solana"
            className="w-6 h-6"
          />
          <input
            placeholder="sol amount"
            value={amount}
            onChange={handleAmountChange}
            step="0.01"
            min="0"
            max="100"
            type="number"
            className="w-full outline-none border-none text-[16px] pr-2 remove-arrow placeholder:text-[#8F95B2] text-black bg-inherit"
          />
        </div>
      </div>
      <div className="w-[60%] bg-gradient-to-r from-[#000000] to-[#ffffff] h-[1px] mt-[12px] mb-[16px]" />
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleDonateClick();
        }}
        disabled={isDonating}
        className="h-[48px] w-full flex items-center justify-center cursor-pointer gap-2 border-[#000000] bg-gradient-to-r from-[#000000] to-[#454545] text-[#FFD44F] text-[16px] rounded-[8px] outline-none border-none disabled:opacity-[0.6] disabled:cursor-not-allowed"
      >
        {isDonating ? (
          <div className="w-6 h-6 border-2 border-[#FFD44F] border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <span className="text-[24px]">🫳</span>
            <span className="font-bold text-[#FFD44F]">Donate</span>
          </>
        )}
      </button>
    </div>
  );
};

export default DonateComponent;
