"use client";
import React from "react";
import BackToBegs from "@/components/BackToBegs";
import CreateBegForm from "@/components/CreateBegForm";
import Modal from "@/components/Modal";
import { FC, memo, use, useState, useEffect, useRef, useMemo } from "react";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";
import {
  formatSolAmount,
  voiceIds,
  getFlagIcon,
  formatMessageTime,
  detectSolanaAddress,
  isVideoUrl,
} from "@/utils";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { Virtuoso } from "react-virtuoso";
import { ReactionsType } from "@/interfaces";
import Link from "next/link";
import MessageText from "@/components/MessageText";
import DonateButton from "@/components/DonateButton";
import { useWallet } from "@solana/wallet-adapter-react";
import BN from "bn.js";
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

interface UserData {
  amountDonated: number;
  amountRaised: number;
  bio: string;
  createdAt: string;
  imageUrl: string;
  totalBegs: number;
  totalDonations: number;
  walletAddress: string;
}

interface Message {
  walletAddress: string;
  text: string;
  solAmount: string;
  _id: string;
  begStatus: string;
  timestamp: string;
  voiceType: string;
  voiceId: string;
  fillAmount: string;
  reactions: ReactionsType;
  imageUrl?: string;
  isNew?: boolean;
}

interface PaginationState {
  total_count: number;
  page: number;
  limit: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

const COOLDOWN_DURATION = 60;

const ClientPage: FC<{ params: Promise<{ wallet: string }> }> = memo(
  ({ params }) => {
    const { wallet } = use(params);
    const { websocket, onMessage } = useWebSocket();
    const { publicKey, sendTransaction } = useWallet();
    const { userData: contextUserData } = useUser();
    const [begsType, setBegsType] = useState<"received" | "asked">("received");
    const [openCreateBegModal, setOpenCreateBegModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isInCooldown, setIsInCooldown] = useState(false);
    const [cooldownSeconds, setCooldownSeconds] = useState(0);
    const [profileUserData, setProfileUserData] = useState<UserData | null>(
      null
    );
    const [donatingMessageId, setDonatingMessageId] = useState<string | null>(
      null
    );

    // Separate states for received and asked begs
    const [receivedBegs, setReceivedBegs] = useState<Message[]>([]);
    const [askedBegs, setAskedBegs] = useState<Message[]>([]);

    // Separate pagination states
    const [receivedPagination, setReceivedPagination] =
      useState<PaginationState>({
        total_count: 0,
        page: 1,
        limit: 50,
        total_pages: 1,
        has_next: false,
        has_prev: false,
      });
    const [viewImageModal, setViewImageModal] = useState<{
      isOpen: boolean;
      imageUrl: string;
      isVideo: boolean;
    }>({
      isOpen: false,
      imageUrl: "",
      isVideo: false,
    });
    const [askedPagination, setAskedPagination] = useState<PaginationState>({
      total_count: 0,
      page: 1,
      limit: 50,
      total_pages: 1,
      has_next: false,
      has_prev: false,
    });

    const loadMoreRef = useRef<HTMLDivElement>(null);

    const connection = new Connection(process.env.NEXT_PUBLIC_RPC!);

    // Fetch user data if not available in context
    useEffect(() => {
      const fetchUserData = async () => {
        // If the wallet in params matches the context user's wallet, use that data
        if (contextUserData && contextUserData.walletAddress === wallet) {
          setProfileUserData(contextUserData);
          return;
        }

        // Otherwise, fetch the user data from the API
        setIsLoading(true);
        try {
          const response = await fetch(
            `https://7dfinzalu3.execute-api.ap-south-1.amazonaws.com/dev/?method=get_beg_user&walletAddress=${wallet}`
          );
          const data = await response.json();

          if (data.message === "User retrieved successfully") {
            setProfileUserData(data.data);
          } else {
            toast.error("User not registered with begs fun!");
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          toast.error("Failed to fetch user data");
        } finally {
          setIsLoading(false);
        }
      };

      fetchUserData();
    }, [wallet, contextUserData]);

    // Function to fetch received begs
    const fetchReceivedBegs = async (page: number = 1) => {
      try {
        const isInitialFetch = page === 1;
        if (isInitialFetch) {
          setIsLoading(true);
        } else {
          setIsLoadingMore(true);
        }

        const response = await fetch(
          `https://7dfinzalu3.execute-api.ap-south-1.amazonaws.com/dev/?method=get_begs_by_begged_to&walletAddress=${wallet}&page=${page}&limit=${receivedPagination.limit}`
        );
        const data = await response.json();

        if (isInitialFetch) {
          setReceivedBegs(
            data.data.map((d: any) => ({
              walletAddress: d.walletAddress,
              text: d.text,
              solAmount: d.solAmount,
              _id: d._id,
              begStatus: d.begStatus,
              timestamp: d.timestamp,
              voiceType: d.voiceType || "Indian",
              voiceId: d.voiceId || voiceIds.Indian[0],
              fillAmount: d.fillAmount || "0",
              reactions: d.reactions || {},
              imageUrl: d.imageUrl || null,
            }))
          );
        } else {
          setReceivedBegs((prev) => [
            ...prev,
            ...data.data.map((d: any) => ({
              walletAddress: d.walletAddress,
              text: d.text,
              solAmount: d.solAmount,
              _id: d._id,
              begStatus: d.begStatus,
              timestamp: d.timestamp,
              voiceType: d.voiceType || "Indian",
              voiceId: d.voiceId || voiceIds.Indian[0],
              fillAmount: d.fillAmount || "0",
              reactions: d.reactions || {},
              imageUrl: d.imageUrl || null,
            })),
          ]);
        }
        setReceivedPagination(data.pagination);
      } catch (error) {
        console.error("Error fetching received begs:", error);
        toast.error("Failed to fetch received begs");
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    };

    // Function to fetch asked begs
    const fetchAskedBegs = async (page: number = 1) => {
      try {
        const isInitialFetch = page === 1;
        if (isInitialFetch) {
          setIsLoading(true);
        } else {
          setIsLoadingMore(true);
        }

        const response = await fetch(
          `https://7dfinzalu3.execute-api.ap-south-1.amazonaws.com/dev/?method=get_beg_messages&walletAddress=${wallet}&page=${page}&limit=${askedPagination.limit}`
        );
        const data = await response.json();

        if (isInitialFetch) {
          setAskedBegs(
            data.data.map((d: any) => ({
              walletAddress: d.walletAddress,
              text: d.text,
              solAmount: d.solAmount,
              _id: d._id,
              begStatus: d.begStatus,
              timestamp: d.timestamp,
              voiceType: d.voiceType || "Indian",
              voiceId: d.voiceId || voiceIds.Indian[0],
              fillAmount: d.fillAmount || "0",
              reactions: d.reactions || {},
              imageUrl: d.imageUrl || null,
            }))
          );
        } else {
          setAskedBegs((prev) => [
            ...prev,
            ...data.data.map((d: any) => ({
              walletAddress: d.walletAddress,
              text: d.text,
              solAmount: d.solAmount,
              _id: d._id,
              begStatus: d.begStatus,
              timestamp: d.timestamp,
              voiceType: d.voiceType || "Indian",
              voiceId: d.voiceId || voiceIds.Indian[0],
              fillAmount: d.fillAmount || "0",
              reactions: d.reactions || {},
              imageUrl: d.imageUrl || null,
            })),
          ]);
        }
        setAskedPagination(data.pagination);
      } catch (error) {
        console.error("Error fetching asked begs:", error);
        toast.error("Failed to fetch asked begs");
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    };

    // Function to fetch more begs based on current type
    const fetchMoreBegs = async () => {
      const currentPagination =
        begsType === "received" ? receivedPagination : askedPagination;
      if (!currentPagination.has_next || isLoadingMore) return;

      const nextPage = currentPagination.page + 1;
      if (begsType === "received") {
        await fetchReceivedBegs(nextPage);
      } else {
        await fetchAskedBegs(nextPage);
      }
    };

    // Effect to fetch initial begs when type changes
    useEffect(() => {
      if (begsType === "received") {
        fetchReceivedBegs();
      } else {
        fetchAskedBegs();
      }
    }, [begsType, wallet]);

    // Add intersection observer for infinite scroll
    useEffect(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            fetchMoreBegs();
          }
        },
        { threshold: 0.1 }
      );

      if (loadMoreRef.current) {
        observer.observe(loadMoreRef.current);
      }

      return () => {
        if (loadMoreRef.current) {
          observer.unobserve(loadMoreRef.current);
        }
      };
    }, [begsType]);

    const handleDonate = async (
      recipientAddress: string,
      amount: string,
      messageId: string
    ) => {
      try {
        if (!publicKey) {
          toast.info("Connect wallet to donate!");
          return;
        }
        // Validate recipient address is a valid base58 string
        if (!detectSolanaAddress(recipientAddress)) {
          toast.error("Invalid recipient wallet address");
          return;
        }

        // Validate admin account address is a valid base58 string
        if (
          !process.env.NEXT_PUBLIC_BEG_ADMIN_ACCOUNT ||
          !detectSolanaAddress(process.env.NEXT_PUBLIC_BEG_ADMIN_ACCOUNT)
        ) {
          toast.error("Invalid admin wallet address");
          return;
        }

        setDonatingMessageId(messageId);

        const totalAmount = Number(amount) * LAMPORTS_PER_SOL;
        const feeAmount = Math.round((totalAmount * 1) / 100); // 1% fee
        const swapAmount = totalAmount - feeAmount; // 99% for swap

        const toPubkey = new PublicKey(recipientAddress);
        const feePubkey = new PublicKey(
          process.env.NEXT_PUBLIC_BEG_ADMIN_ACCOUNT!
        );

        const transaction = new Transaction();

        // Get fresh blockhash
        const { blockhash, lastValidBlockHeight } =
          await connection.getLatestBlockhash("finalized");
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = publicKey;

        // Add fee transfer instruction
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: feePubkey,
            lamports: feeAmount,
          })
        );

        // Get quote for SOL to BEGS swap
        console.log("Requesting quote with params:", {
          inputMint: "So11111111111111111111111111111111111111112",
          outputMint: process.env.NEXT_PUBLIC_PUMP_ADD,
          amount: swapAmount,
        });

        const quoteResponse = await fetch(
          `https://quote-api.jup.ag/v6/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=${process.env.NEXT_PUBLIC_PUMP_ADD}&amount=${swapAmount}&slippageBps=100&onlyDirectRoutes=false&asLegacyTransaction=true`
        ).then((res) => res.json());

        // Check if the response has the required data
        if (!quoteResponse || !quoteResponse.outAmount) {
          console.error("Quote response error:", quoteResponse);
          throw new Error(
            `Failed to get quote from Jupiter: ${JSON.stringify(quoteResponse)}`
          );
        }

        // Get swap transaction
        console.log("Requesting swap with params:", {
          quoteResponse,
          userPublicKey: publicKey.toBase58(),
        });

        const swapResponse = await fetch("https://quote-api.jup.ag/v6/swap", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            quoteResponse,
            userPublicKey: publicKey.toBase58(),
            wrapUnwrapSOL: true,
            computeUnitPriceMicroLamports: 1000,
            asLegacyTransaction: true,
          }),
        }).then((res) => res.json());

        console.log("Swap response:", swapResponse);

        if (!swapResponse || !swapResponse.swapTransaction) {
          console.error("Swap response error:", swapResponse);
          throw new Error(
            `Failed to create swap transaction: ${JSON.stringify(swapResponse)}`
          );
        }

        // Add swap transaction to our transaction
        const swapTransaction = Transaction.from(
          Buffer.from(swapResponse.swapTransaction, "base64")
        );
        transaction.add(...swapTransaction.instructions);

        // Find our (sender's) associated token account for BEGS
        const [senderTokenAccount] = await PublicKey.findProgramAddress(
          [
            publicKey.toBuffer(),
            TOKEN_PROGRAM_ID.toBuffer(),
            new PublicKey(process.env.NEXT_PUBLIC_PUMP_ADD!).toBuffer(),
          ],
          ASSOCIATED_TOKEN_PROGRAM_ID
        );

        // Find the recipient's associated token account for BEGS
        const [recipientTokenAccount] = await PublicKey.findProgramAddress(
          [
            toPubkey.toBuffer(),
            TOKEN_PROGRAM_ID.toBuffer(),
            new PublicKey(process.env.NEXT_PUBLIC_PUMP_ADD!).toBuffer(),
          ],
          ASSOCIATED_TOKEN_PROGRAM_ID
        );

        // Add create associated token account instruction if it doesn't exist
        const recipientTokenAccountInfo = await connection.getAccountInfo(
          recipientTokenAccount
        );
        if (!recipientTokenAccountInfo) {
          transaction.add({
            programId: ASSOCIATED_TOKEN_PROGRAM_ID,
            keys: [
              { pubkey: publicKey, isSigner: true, isWritable: true },
              {
                pubkey: recipientTokenAccount,
                isSigner: false,
                isWritable: true,
              },
              { pubkey: toPubkey, isSigner: false, isWritable: false },
              {
                pubkey: new PublicKey(process.env.NEXT_PUBLIC_PUMP_ADD!),
                isSigner: false,
                isWritable: false,
              },
              {
                pubkey: SystemProgram.programId,
                isSigner: false,
                isWritable: false,
              },
              { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
              {
                pubkey: SYSVAR_RENT_PUBKEY,
                isSigner: false,
                isWritable: false,
              },
            ],
            data: Buffer.from([]),
          });
        }

        // Calculate BEGS amount to send to recipient (95% of swapped amount)
        const begsAmount = Math.floor(
          (Number(quoteResponse.outAmount) * 95) / 100
        );

        // Add BEGS transfer instruction from our ATA to recipient's ATA
        transaction.add({
          programId: TOKEN_PROGRAM_ID,
          keys: [
            { pubkey: senderTokenAccount, isSigner: false, isWritable: true }, // From our ATA
            {
              pubkey: recipientTokenAccount,
              isSigner: false,
              isWritable: true,
            }, // To recipient's ATA
            { pubkey: publicKey, isSigner: true, isWritable: false }, // Authority
          ],
          data: Buffer.from([3, ...new BN(begsAmount).toArray("le", 8)]), // Transfer instruction
        });

        const signature = await sendTransaction(transaction, connection);

        // Confirm transaction with proper blockhash info
        const confirmation = await connection.confirmTransaction(
          {
            signature,
            blockhash,
            lastValidBlockHeight,
          },
          "confirmed"
        );

        if (confirmation.value.err) {
          toast.error("Donation failed!");
          throw new Error("Transaction failed");
        }

        // Find the current message to get its solAmount and fillAmount
        const currentMessage = receivedBegs.find(
          (msg) => msg._id === messageId
        );
        if (!currentMessage) {
          throw new Error("Message not found");
        }

        const newFillAmount =
          Number(currentMessage.fillAmount) + Number(amount);
        const isFilled = newFillAmount >= Number(currentMessage.solAmount);

        websocket?.send(
          JSON.stringify({
            action: "updateBegMessage",
            messageId,
            walletAddress: publicKey.toBase58(),
            updates: {
              begStatus: isFilled ? "completed" : "pending",
              fillAmount: newFillAmount.toString(),
            },
          })
        );

        const updateDonorInfo = {
          action: "updateBegUserInfo",
          walletAddress: contextUserData?.walletAddress,
          updates: {
            totalDonations: (contextUserData?.totalDonations || 0) + 1,
            amountDonated: (contextUserData?.amountDonated || 0) + amount,
          },
        };

        websocket?.send(JSON.stringify(updateDonorInfo));

        const updateBeggarInfo = {
          action: "updateBegUserInfo",
          walletAddress: profileUserData?.walletAddress,
          updates: {
            amountRaised: (profileUserData?.amountRaised || 0) + amount,
          },
        };

        websocket?.send(JSON.stringify(updateBeggarInfo));
      } catch (error) {
        toast.error("Could not make donation!");
        console.log("Transaction error:", error);
      } finally {
        setDonatingMessageId(null);
      }
    };

    // Cooldown timer effect
    useEffect(() => {
      if (!isInCooldown) return;

      const timer = setInterval(() => {
        setCooldownSeconds((prev) => {
          if (prev <= 1) {
            setIsInCooldown(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }, [isInCooldown]);

    useEffect(() => {
      const cleanup = onMessage((event) => {
        try {
          const receivedMessage = JSON.parse(event.data);
          if (
            receivedMessage.type === "begMessage" ||
            receivedMessage.type === "begMessageConfirmation"
          ) {
            if (receivedMessage.beggedTo === wallet) {
              setReceivedBegs((prevMessages) => {
                const messageExists = prevMessages.some(
                  (msg) => msg._id === receivedMessage.message_id
                );
                if (messageExists) {
                  return prevMessages;
                }

                return [
                  {
                    walletAddress: receivedMessage.walletAddress,
                    text: receivedMessage.text,
                    solAmount: receivedMessage.solAmount,
                    _id: receivedMessage.message_id,
                    begStatus: receivedMessage.begStatus,
                    timestamp: receivedMessage.timestamp,
                    voiceType: receivedMessage.voiceType || "Indian",
                    voiceId: receivedMessage.voiceId || voiceIds.Indian[0],
                    fillAmount: receivedMessage.fillAmount || "0",
                    reactions: receivedMessage.reactions || {},
                    imageUrl: receivedMessage.imageUrl || null,
                    beggedTo: receivedMessage.beggedTo || "",
                    isNew: true,
                  },
                  ...prevMessages,
                ];
              });
            } else if (receivedMessage.walletAddress === wallet) {
              setAskedBegs((prevMessages) => {
                const messageExists = prevMessages.some(
                  (msg) => msg._id === receivedMessage.message_id
                );
                if (messageExists) {
                  return prevMessages;
                }

                return [
                  {
                    walletAddress: receivedMessage.walletAddress,
                    text: receivedMessage.text,
                    solAmount: receivedMessage.solAmount,
                    _id: receivedMessage.message_id,
                    begStatus: receivedMessage.begStatus,
                    timestamp: receivedMessage.timestamp,
                    voiceType: receivedMessage.voiceType || "Indian",
                    voiceId: receivedMessage.voiceId || voiceIds.Indian[0],
                    fillAmount: receivedMessage.fillAmount || "0",
                    reactions: receivedMessage.reactions || {},
                    imageUrl: receivedMessage.imageUrl || null,
                    isNew: true,
                  },
                  ...prevMessages,
                ];
              });
            }
          }
        } catch (error) {
          toast.error("Error fetching beg");
          console.error("Error parsing message:", error);
        }
      });

      return () => {
        cleanup();
      };
    }, []);

    return (
      <>
        <div className="w-full flex flex-col items-start justify-start gap-4 lg:h-full h-[87%]">
          <BackToBegs />
          <div
            className="grow h-full w-full bg-gradient-to-b from-[#FFFFFF] to-[#FFEFBE] border rounded-2xl shadow-[0px_4px_20px_0px_rgba(255,212,72,0.25)] lg:p-4 p-2 overflow-auto"
            style={{ borderColor: "rgba(255, 212, 72, 0.72)" }}
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 border-4 border-[#FFD44F] border-t-[#5D3014] rounded-full animate-spin"></div>
              </div>
            ) : (
              <>
                <div
                  className="w-full rounded-[8px] border p-1 lg:p-3"
                  style={{ borderColor: "rgba(93, 48, 20, 0.32)" }}
                >
                  <div className="flex w-full items-start justify-start">
                    <div className="lg:basis-2/3 w-full flex items-start justify-start gap-4">
                      <img
                        src={
                          profileUserData?.imageUrl ||
                          "/assets/default-profile-icon.svg"
                        }
                        alt="profile"
                        className="w-[120px] h-[120px] rounded-full"
                      />
                      <div className="space-y-[14px]">
                        <Link
                          href={`https://solscan.io/account/${wallet}`}
                          target="_blank"
                          rel="noreferrer noopener nofollower"
                          className="font-bold text-[20px] text-[#5D3014] leading-[120%] hover:underline"
                        >
                          {wallet.slice(0, 4)}...{wallet.slice(-4)}
                        </Link>
                        <p className="text-black text-[16px] break-all">
                          {profileUserData?.walletAddress &&
                          profileUserData?.bio
                            ? profileUserData?.bio
                            : "User not registered with BegsFun!"}
                        </p>
                      </div>
                    </div>
                    <div className="hidden lg:basis-1/3 lg:flex justify-end grow">
                      <button
                        onClick={() => setOpenCreateBegModal(true)}
                        className="cursor-pointer py-1 px-3 flex w-fit items-center gap-2 border border-[#000000] bg-gradient-to-r from-[#000000] to-[#454545] rounded-full"
                        style={{
                          filter:
                            "drop-shadow(0px 4px 8px rgba(93, 48, 20, 0.4))",
                        }}
                      >
                        <img
                          src="/assets/bolt-beg-icon.svg"
                          alt="bolt-beg"
                          className="w-4 h-4"
                        />
                        <span className="text-[#FFD44F] text-[16px] font-bold">
                          Beg
                        </span>
                      </button>
                    </div>
                  </div>
                  <hr
                    className="w-full h-0 border-[0.5px] opacity-100 flex-shrink-0 mt-[24px] mb-[16px]"
                    style={{ borderColor: "rgba(93, 48, 20, 0.34)" }}
                  />
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-start gap-2 lg:gap-[40px]">
                    <div className="flex items-start justify-start gap-2 lg:gap-[40px] max-lg:basis-1/2 max-lg:w-full">
                      <div className="max-lg:w-[49%] flex-shrink-0 border border-dashed border-[#5D3014] rounded-[4px] py-2 px-4 bg-gradient-to-b from-[#FFD44F] to-[#fff]">
                        <p className="text-[#5D3014] text-[14px]">Donated</p>
                        <p className="text-[20px] text-[#5D3014] font-bold flex items-center gap-1">
                          <img
                            src="/assets/solana-brown-icon.svg"
                            alt="sol"
                            className="w-6 h-6"
                          />
                          {profileUserData?.amountDonated
                            ? `${formatSolAmount(
                                profileUserData?.amountDonated || 0
                              )}`
                            : "0"}
                        </p>
                      </div>
                      <div className="max-lg:w-[49%] flex-shrink-0 border border-dashed border-[#5D3014] rounded-[4px] py-2 px-4 bg-gradient-to-b from-[#FFD44F] to-[#fff]">
                        <p className="text-[#5D3014] text-[14px]">Donations</p>
                        <p className="text-[20px] text-[#5D3014] font-bold">
                          {profileUserData?.totalDonations
                            ? `${formatSolAmount(
                                profileUserData?.totalDonations || 0
                              )}`
                            : "0"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start justify-start gap-2 lg:gap-[40px] max-lg:basis-1/2 max-lg:w-full">
                      <div className="max-lg:w-[49%] flex-shrink-0 border border-dashed border-[#5D3014] rounded-[4px] py-2 px-4 bg-gradient-to-b from-[#FFD44F] to-[#fff]">
                        <p className="text-[#5D3014] text-[14px]">
                          Begs received
                        </p>
                        <p className="text-[20px] text-[#5D3014] font-bold flex items-center gap-1">
                          <img
                            src="/assets/solana-brown-icon.svg"
                            alt="sol"
                            className="w-6 h-6"
                          />
                          {profileUserData?.amountRaised
                            ? `${formatSolAmount(
                                profileUserData?.amountRaised || 0
                              )}`
                            : "0"}
                        </p>
                      </div>
                      <div className="max-lg:w-[49%] flex-shrink-0 border border-dashed border-[#5D3014] rounded-[4px] py-2 px-4 bg-gradient-to-b from-[#FFD44F] to-[#fff]">
                        <p className="text-[#5D3014] text-[14px]">Begs asked</p>
                        <p className="text-[20px] text-[#5D3014] font-bold">
                          {profileUserData?.totalBegs
                            ? `${formatSolAmount(
                                profileUserData?.totalBegs || 0
                              )}`
                            : "0"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-2 lg:mt-4 flex items-center gap-4">
                  <button
                    onClick={() => setBegsType("received")}
                    className="border border-[#5D3014] rounded-full py-1 px-4 flex items-center gap-2 cursor-pointer"
                    style={{
                      background:
                        begsType === "received" ? "#FFD44F" : "transparent",
                    }}
                  >
                    <img
                      src="/assets/bowl-icon.svg"
                      alt="bowl"
                      className="w-6 h-6"
                    />
                    <span className="text-[14px] font-bold text-[#5D3014]">
                      Begs received
                    </span>
                  </button>
                  <button
                    onClick={() => setBegsType("asked")}
                    className="border border-[#5D3014] rounded-full py-1 px-4 flex items-center gap-2 cursor-pointer"
                    style={{
                      background:
                        begsType === "asked" ? "#FFD44F" : "transparent",
                    }}
                  >
                    <span className="text-[16px] font-bold">🫴🏾</span>
                    <span className="text-[14px] font-bold text-[#5D3014]">
                      Begs asked
                    </span>
                  </button>
                </div>
                <div className="mt-4 flex-1 overflow-hidden w-full h-full">
                  <Virtuoso
                    style={{ height: "100%" }}
                    totalCount={
                      begsType === "received"
                        ? receivedBegs.length
                        : askedBegs.length
                    }
                    itemContent={(index) => {
                      const msg =
                        begsType === "received"
                          ? receivedBegs[index]
                          : askedBegs[index];
                      return (
                        <Link href={`/beg/${msg._id}`} className="w-full">
                          <div
                            className="py-3 border-b-[0.5px]"
                            style={{ borderColor: "rgba(9, 48, 29, 0.32)" }}
                          >
                            <div className="flex items-center gap-2 justify-between">
                              <div className="flex items-center gap-2">
                                <img
                                  src={getFlagIcon(msg.voiceType)}
                                  alt={msg.voiceType.toLowerCase()}
                                  className="w-5 h-5"
                                />
                                <a
                                  href={`/profile/${msg.walletAddress}`}
                                  className="font-[Montserrat] text-[#5D3014] font-medium text-[12px] hover:underline"
                                >
                                  {msg.walletAddress.slice(0, 4)}...
                                  {msg.walletAddress.slice(-4)}
                                </a>
                                <div className="w-1 h-1 rounded-full bg-[#FFD44F]" />
                                <span className="font-[Montserrat] font-medium text-[12px] text-[#5D3014]">
                                  {formatMessageTime(msg.timestamp)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mr-3">
                                <img
                                  src="/assets/pixelated-arrow-right-icon.svg"
                                  alt="arrow"
                                  className="w-6 h-6"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2 mt-2">
                              {msg.imageUrl ? (
                                // Check if it's a video by extension
                                isVideoUrl(msg.imageUrl) ? (
                                  <div
                                    className="relative w-[56px] h-[56px] flex-shrink-0 rounded-[4px] cursor-pointer overflow-hidden"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      setViewImageModal({
                                        isOpen: true,
                                        imageUrl: msg.imageUrl!,
                                        isVideo: true,
                                      });
                                    }}
                                  >
                                    <video
                                      src={msg.imageUrl}
                                      className="w-full h-full object-cover"
                                      muted
                                    />
                                    {/* Video play indicator overlay */}
                                    <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                                      <img
                                        src="/assets/play-icon.svg"
                                        alt="play video"
                                        className="w-8 h-8 opacity-80"
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <img
                                    src={msg.imageUrl}
                                    alt="message attachment"
                                    className="w-[56px] h-[56px] flex-shrink-0 object-contain rounded-[4px] cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      setViewImageModal({
                                        isOpen: true,
                                        imageUrl: msg.imageUrl!,
                                        isVideo: false,
                                      });
                                    }}
                                  />
                                )
                              ) : null}
                              <MessageText
                                text={msg.text}
                                setIsExpanded={() => {}}
                              />
                            </div>

                            {begsType === "received" ? (
                              <>
                                {msg.begStatus === "completed" ? (
                                  <div className="mt-2 rounded-[8px] h-full w-full px-4 py-1 border border-black flex items-center gap-2 bg-[#FFD44F] shadow-[inset_0px_4px_8px_0px_rgba(0,0,0,0.25)]">
                                    <img
                                      src="/assets/check-fulfilled-icon.svg"
                                      alt="solana"
                                      className="w-4 h-4"
                                      loading="lazy"
                                    />
                                    <p className="text-[#5D3014] text-[14px]">
                                      Beg fulfilled
                                    </p>
                                  </div>
                                ) : contextUserData &&
                                  contextUserData.walletAddress === wallet ? (
                                  <div className="mt-2">
                                    <DonateButton
                                      handleDonate={handleDonate}
                                      donatingMessageId={donatingMessageId}
                                      msg={msg}
                                      hideSolAmount={true}
                                    />
                                  </div>
                                ) : null}
                              </>
                            ) : (
                              <div className="mt-2">
                                <div className="relative w-full h-[12px] bg-[#FFD44F] rounded-[200px] overflow-hidden">
                                  <div
                                    className="absolute top-0 left-0 h-full transition-all duration-300 rounded-[200px]"
                                    style={{
                                      width: `${Math.min(
                                        100,
                                        (Number(msg.fillAmount) /
                                          Number(msg.solAmount)) *
                                          100
                                      )}%`,
                                      background:
                                        "linear-gradient(to right, #009A49, #29F188)",
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </Link>
                      );
                    }}
                    endReached={() => {
                      if (
                        (begsType === "received"
                          ? receivedPagination
                          : askedPagination
                        ).has_next &&
                        !isLoadingMore
                      ) {
                        fetchMoreBegs();
                      }
                    }}
                    components={{
                      Footer: () => (
                        <div
                          ref={loadMoreRef}
                          className="flex items-center justify-center py-4"
                        >
                          {isLoadingMore ? (
                            <div className="w-6 h-6 border-3 border-[#FFD44F] border-t-[#5D3014] rounded-full animate-spin"></div>
                          ) : (begsType === "received"
                              ? receivedPagination
                              : askedPagination
                            ).has_next ? (
                            <span className="text-[#5D3014] text-sm">
                              Scroll for more
                            </span>
                          ) : null}
                        </div>
                      ),
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
        <Modal
          isOpen={openCreateBegModal}
          onClose={() => setOpenCreateBegModal(false)}
        >
          <CreateBegForm
            onClose={() => setOpenCreateBegModal(false)}
            onSendMessage={(messageData) => {
              websocket?.send(
                JSON.stringify({
                  ...messageData,
                  beggedTo: wallet,
                })
              );

              const updateUserBeg = {
                action: "updateBegUserInfo",
                walletAddress: contextUserData?.walletAddress,
                updates: {
                  totalBegs: (contextUserData?.totalBegs || 0) + 1,
                },
              };
              websocket?.send(JSON.stringify(updateUserBeg));
              setOpenCreateBegModal(false);

              // Start cooldown after sending message
              setIsInCooldown(true);
              setCooldownSeconds(COOLDOWN_DURATION);
            }}
            isInCooldown={isInCooldown}
            cooldownSeconds={cooldownSeconds}
          />
        </Modal>
        <Modal
          isOpen={viewImageModal.isOpen}
          onClose={() =>
            setViewImageModal({ isOpen: false, imageUrl: "", isVideo: false })
          }
          style={{ background: "transparent", border: "none" }}
        >
          <div className="flex justify-center items-center h-full w-full">
            {viewImageModal.isVideo ? (
              <video
                src={viewImageModal.imageUrl}
                controls
                autoPlay
                className="max-w-full max-h-[80vh] object-contain rounded-[8px]"
              />
            ) : (
              <img
                src={viewImageModal.imageUrl}
                alt="Full size attachment"
                className="max-w-full max-h-[80vh] object-contain rounded-[8px]"
              />
            )}
          </div>
        </Modal>
      </>
    );
  }
);

export default ClientPage;
