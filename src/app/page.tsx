"use client";
import React, { useRef, useEffect } from "react";
import {
  Connection,
  PublicKey,
  SYSVAR_RENT_PUBKEY,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { useState, useCallback, useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "sonner";
import {
  COOLDOWN_DURATION,
  detectSolanaAddress,
  formatMessageTime,
  formatSolAmount,
  getFlagIcon,
  isVideoUrl,
  reactions,
  voiceIds,
} from "@/utils";
import { VirtuosoGrid } from "react-virtuoso";
import Modal from "@/components/Modal";
import SocialLinks from "@/components/SocialLinks";
import DonateButton from "@/components/DonateButton";
import PlayPauseButton from "@/components/PlayPauseButton";
import { ReactionsType } from "@/interfaces";
import MessageText from "@/components/MessageText";
import Link from "next/link";
import { useWebSocket } from "@/contexts/WebSocketContext";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import BN from "bn.js";
import CreateBegForm from "@/components/CreateBegForm";
import { useUser } from "@/contexts/UserContext";

export default function Home() {
  const { websocket, onMessage } = useWebSocket();
  const [messages, setMessages] = useState<
    {
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
      isNew?: boolean; // Track new messages for animation
    }[]
  >([]);
  const [isMessageExpanded, setIsMessageExpanded] = useState(false);
  const [expandedMessage, setExpandedMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [pagination, setPagination] = useState<{
    total_count: number;
    page: number;
    limit: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  }>({
    total_count: 0,
    page: 1,
    limit: 50,
    total_pages: 1,
    has_next: false,
    has_prev: false,
  });
  const { userData: contextUserData } = useUser();
  const [walletAddress, setWalletAddress] = useState("");
  const [lastActive, setLastActive] = useState<number>(Date.now());
  const idleCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isInCooldown, setIsInCooldown] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const { publicKey, sendTransaction, connected } = useWallet();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [donatingMessageId, setDonatingMessageId] = useState<string | null>(
    null
  );
  const [isInputAreaOpen, setIsInputAreaOpen] = useState(false);
  const [reactionsMessageId, setReactionsMessageId] = useState<string | null>(
    null
  );
  const [deletingMessageIds, setDeletingMessageIds] = useState<string[]>([]);
  const [viewImageModal, setViewImageModal] = useState<{
    isOpen: boolean;
    imageUrl: string;
    isVideo: boolean;
  }>({
    isOpen: false,
    imageUrl: "",
    isVideo: false,
  });
  const [openCreateBegModal, setOpenCreateBegModal] = useState(false);

  const connection = new Connection(process.env.NEXT_PUBLIC_RPC!);

  const adminWallets = process.env.NEXT_PUBLIC_ADMIN_WALLETS
    ? process.env.NEXT_PUBLIC_ADMIN_WALLETS.split(",")
    : [];
  // Function to fetch initial messages
  const fetchInitialMessages = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `https://7dfinzalu3.execute-api.ap-south-1.amazonaws.com/dev/?method=get_beg_messages&page=1&limit=${pagination.limit}`
      );
      const data = await response.json();
      setMessages(
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
      setPagination(data.pagination);
    } catch (error) {
      toast.error("Error fetching initial messages");
      console.error("Error fetching initial messages:", error);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.limit]);

  const fetchMoreMessages = useCallback(async () => {
    if (!pagination.has_next || isLoadingMore) return;

    try {
      setIsLoadingMore(true);
      const nextPage = pagination.page + 1;

      const response = await fetch(
        `https://7dfinzalu3.execute-api.ap-south-1.amazonaws.com/dev/?method=get_beg_messages&page=${nextPage}&limit=${pagination.limit}`
      );
      const data = await response.json();

      setMessages((prevMessages) => [
        ...prevMessages,
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
      setPagination(data.pagination);
    } catch (error) {
      toast.error("Error loading more messages");
      console.error("Error loading more messages:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [pagination.has_next, pagination.page, pagination.limit, isLoadingMore]);

  // Setup WebSocket message handler
  useEffect(() => {
    const cleanup = onMessage((event) => {
      try {
        const receivedMessage = JSON.parse(event.data);
        if (
          receivedMessage.type === "begMessage" ||
          receivedMessage.type === "begMessageConfirmation"
        ) {
          setMessages((prevMessages) => {
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
          setOpenCreateBegModal(false);
          setIsInputAreaOpen(false);
        }
        // Handle message updates
        else if (
          receivedMessage.type === "begMessageUpdate" ||
          receivedMessage.type === "begMessageUpdateConfirmation"
        ) {
          toast.success(
            `Donation of ${formatSolAmount(
              receivedMessage.fillAmount
            )} sol successful!`
          );

          // Update an existing message, mark as new for animation, and move to the front
          setMessages((prevMessages) => {
            // Find the message to update
            const updatedMessageIndex = prevMessages.findIndex(
              (msg) => msg._id === receivedMessage.message_id
            );

            if (updatedMessageIndex === -1) return prevMessages;

            // Create a copy of the messages array
            const newMessages = [...prevMessages];

            // Get the message and update it
            const updatedMessage = {
              ...newMessages[updatedMessageIndex],
              begStatus: receivedMessage.begStatus,
              fillAmount: receivedMessage.fillAmount || "0",
              isNew: true, // Mark as new for animation
            };

            // Remove the message from its current position
            newMessages.splice(updatedMessageIndex, 1);

            // Add the updated message to the beginning of the array
            return [updatedMessage, ...newMessages];
          });
        } else if (
          receivedMessage.type === "begMessageDeleted" ||
          receivedMessage.type === "begMessageDeletedConfirmation"
        ) {
          // Remove from deleting messages list
          setDeletingMessageIds((prev) =>
            prev.filter((id) => id !== receivedMessage.message_id)
          );

          // Store the current scroll position
          const container = document.getElementById("messages-container");
          if (!container) return;
          const oldScrollTop = container.scrollTop;

          setMessages((prevMessages) =>
            prevMessages.filter(
              (message) => message._id !== receivedMessage.message_id
            )
          );
          // After state updates, restore the exact same scroll position
          requestAnimationFrame(() => {
            container.scrollTop = oldScrollTop;
          });

          if (receivedMessage.type === "begMessageDeletedConfirmation") {
            toast.success("Message deleted by admin!");
          }
        } else if (
          receivedMessage.type === "begMessageReaction" ||
          receivedMessage.type === "begMessageReactionConfirmation"
        ) {
          setMessages((prevMessages) =>
            prevMessages.map((message) => {
              if (message._id === receivedMessage.message_id) {
                // Create a new message object with updated reactions
                const updatedMessage = {
                  ...message,
                  reactions: receivedMessage.reaction_counts || {},
                };

                return updatedMessage;
              }
              return message;
            })
          );
          if (receivedMessage.action === "added") {
            const reactionAudio = reactions.find(
              (r) => r.val === receivedMessage.reaction_type
            )?.audio;
            if (reactionAudio) {
              const audio = new Audio(reactionAudio);
              audio.volume = 0.6;
              audio.play().catch((error) => {
                console.error("Error playing reaction audio:", error);
              });
            }
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
  }, [onMessage, setOpenCreateBegModal, setIsInputAreaOpen, setMessages, setDeletingMessageIds, formatSolAmount]);

  const deleteBegMessage = (messageId: string) => {
    try {
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        // Add this message ID to the deleting list
        setDeletingMessageIds((prev) => [...prev, messageId]);

        websocket.send(
          JSON.stringify({
            action: "deleteBegMessage",
            messageId,
            walletAddress,
          })
        );
        console.log(`Delete request sent for message: ${messageId}`);
      } else {
        console.error("WebSocket connection not open");
        toast.error("Connection error. Please refresh the page.");
      }
    } catch (error) {
      console.log("error", error);
    }
  };

  // Handle user activity tracking
  useEffect(() => {
    // Update last active timestamp on user interaction
    const handleActivity = () => {
      setLastActive(Date.now());
    };

    // Check for idle time every minute
    idleCheckIntervalRef.current = setInterval(() => {
      const idleTime = Date.now() - lastActive;
      // If user has been idle for more than 5 minutes, refresh data
      if (idleTime > 5 * 60 * 1000) {
        fetchInitialMessages();
        setLastActive(Date.now());
      }
    }, 60 * 1000);

    // Add event listeners for user activity
    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("click", handleActivity);
    window.addEventListener("scroll", handleActivity);

    return () => {
      // Clean up event listeners
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("scroll", handleActivity);

      if (idleCheckIntervalRef.current) {
        clearInterval(idleCheckIntervalRef.current);
      }
    };
  }, [lastActive, fetchInitialMessages]);

  // Fetch initial messages on load
  useEffect(() => {
    fetchInitialMessages();
  }, []);

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

  // Populate wallet address when connected
  useEffect(() => {
    if (publicKey) {
      setWalletAddress(publicKey.toBase58());
    } else {
      setWalletAddress("");
    }
  }, [publicKey]);

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
            { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
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
          { pubkey: recipientTokenAccount, isSigner: false, isWritable: true }, // To recipient's ATA
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
      const currentMessage = messages.find((msg) => msg._id === messageId);
      if (!currentMessage) {
        throw new Error("Message not found");
      }

      const newFillAmount = Number(currentMessage.fillAmount) + Number(amount);
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

      const response = await fetch(
        `https://7dfinzalu3.execute-api.ap-south-1.amazonaws.com/dev/?method=get_beg_user&walletAddress=${recipientAddress}`
      );
      const data = await response.json();
      if (data.message === "User retrieved successfully") {
        const updateBeggarInfo = {
          action: "updateBegUserInfo",
          walletAddress: data.data?.walletAddress,
          updates: {
            amountRaised: (data.data?.amountRaised || 0) + amount,
          },
        };

        websocket?.send(JSON.stringify(updateBeggarInfo));
      }
    } catch (error) {
      toast.error("Could not make donation!");
      console.log("Transaction error:", error);
    } finally {
      setDonatingMessageId(null);
    }
  };

  // Add intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchMoreMessages();
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
  }, [fetchMoreMessages]);

  const reactToBegMessage = (messageId: string, reactionType: string) => {
    if (!websocket || websocket.readyState !== WebSocket.OPEN) {
      console.error("WebSocket connection not open");
      return;
    }

    websocket.send(
      JSON.stringify({
        action: "reactToBegMessage",
        messageId,
        walletAddress,
        reactionType,
      })
    );
  };

  // Grid components for responsive layout
  const gridComponents = useMemo(
    () => ({
      List: React.forwardRef(({ style, children, ...props }: any, ref: any) => (
        <div
          ref={ref}
          {...props}
          style={{
            display: "flex",
            flexWrap: "wrap",
            ...style,
          }}
        >
          {children}
        </div>
      )),
      Item: ({ children, ...props }: any) => (
        <div
          {...props}
          style={{
            padding: "0.5rem",
            display: "flex",
            flex: "none",
            alignContent: "stretch",
            boxSizing: "border-box",
          }}
          className="w-full lg:w-1/2 xl:w-1/3" // 100% width on mobile, 50% on lg screens and up
        >
          {children}
        </div>
      ),
    }),
    []
  );

  // Add CSS keyframes for the bump animation at the top of the file
  useEffect(() => {
    // Add the keyframes for the bump animation to the document
    const style = document.createElement("style");
    style.innerHTML = `
      @keyframes messageBump {
        0% { transform: translateX(0) scale(1); }
        10% { transform: translateX(-8px) scale(1.02); }
        20% { transform: translateX(8px) scale(1.03); }
        30% { transform: translateX(-7px) scale(1.02); }
        40% { transform: translateX(6px) scale(1.01); }
        50% { transform: translateX(-5px) scale(1.005); }
        60% { transform: translateX(4px) scale(1); }
        70% { transform: translateX(-3px) scale(1); }
        80% { transform: translateX(2px) scale(1); }
        90% { transform: translateX(-1px) scale(1); }
        100% { transform: translateX(0) scale(1); }
      }
      
      .message-bump {
        animation: messageBump 0.6s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        transform-origin: center center;
        position: relative;
        z-index: 10;
        border-radius: 8px;
      }
      
      .message-bump > div:first-child {
        animation: contentFadeIn 1s ease-in forwards;
        border-width: 2px;
        border-color: #FFD44F;
        position: relative;
      }
      
      .message-bump > div:first-child::before {
        content: '';
        position: absolute;
        inset: 0;
        background-color: rgba(255, 212, 79, 0.4);
        border-radius: 8px;
        z-index: 100;
        pointer-events: none;
        animation: highlightFade 0.6s ease-out forwards;
      }
      
      @keyframes highlightFade {
        0% { opacity: 0.9; }
        100% { opacity: 0; }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Function to clear the "new" flag after animation
  useEffect(() => {
    // Find messages marked as new and set a timeout to remove the flag
    const newMessages = messages.filter((msg) => msg.isNew);
    if (newMessages.length > 0) {
      const timeoutIds = newMessages.map((msg) => {
        return setTimeout(() => {
          setMessages((prevMessages) =>
            prevMessages.map((m) =>
              m._id === msg._id ? { ...m, isNew: false } : m
            )
          );
        }, 1200); // Match animation duration
      });

      return () => {
        timeoutIds.forEach((id) => clearTimeout(id));
      };
    }
  }, [messages]);

  return (
    <>
      {process.env.NEXT_PUBLIC_ERROR_SCREEN ? (
        <>
          <div className="grow flex flex-col items-center justify-center gap-2">
            <p className="text-[#5D3014] text-[64px] font-bold leading-tight">
              Fixing Things 🧰
            </p>
            <p className="text-[#5D3014] font-medium">
              Working on a few updates to improve your begging experience.
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="flex-shrink-0 lg:flex w-full items-center justify-between gap-4 hidden mb-2">
            <div className="flex items-center justify-start gap-4">
              <button className="py-1 px-3 flex items-center gap-2 border border-[#5D3014] bg-[#FFD44F] rounded-full">
                <img
                  src="/assets/bowl-icon.svg"
                  alt="bowl"
                  className="w-6 h-6"
                />
                <span className="text-[14px] font-bold text-[#5D3014]">
                  Begs
                </span>
              </button>
              <button className="py-1 px-3 flex items-center gap-2 border border-[#5D3014] bg-[white] rounded-full opacity-[50%]">
                <img
                  src="/assets/coin-flip-btn-icon.svg"
                  alt="bowl"
                  className="w-6 h-6"
                />
                <span className="text-[14px] font-bold text-[#5D3014]">
                  soon
                </span>
              </button>
              <button className="py-1 px-3 flex items-center gap-2 border border-[#5D3014] bg-[white] rounded-full opacity-[50%]">
                <img
                  src="/assets/dice-btn-icon.svg"
                  alt="bowl"
                  className="w-6 h-6"
                />
                <span className="text-[14px] font-bold text-[#5D3014]">
                  soon
                </span>
              </button>
              <button className="py-1 px-3 flex items-center gap-2 border border-[#5D3014] bg-[white] rounded-full opacity-[50%]">
                <img
                  src="/assets/roulette-btn-icon.svg"
                  alt="bowl"
                  className="w-6 h-6"
                />
                <span className="text-[14px] font-bold text-[#5D3014]">
                  soon
                </span>
              </button>
            </div>
            <button
              className="cursor-pointer py-1 px-3 flex items-center gap-2 border border-[#000000] bg-gradient-to-r from-[#000000] to-[#454545] rounded-full"
              onClick={() => {
                setIsInputAreaOpen(true);
                setOpenCreateBegModal(true);
              }}
              style={{
                filter: "drop-shadow(0px 4px 8px rgba(93, 48, 20, 0.4))",
              }}
            >
              <img
                src="/assets/bolt-beg-icon.svg"
                alt="bolt-beg"
                className="w-4 h-4"
              />
              <span className="text-[#FFD44F] text-[16px] font-bold">
                Create Beg
              </span>
            </button>
          </div>
          {/* Messages container */}
          <div
            className="grow flex-1 flex flex-col overflow-hidden max-lg:py-4"
            id="messages-container"
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 border-4 border-[#FFD44F] border-t-[#5D3014] rounded-full animate-spin"></div>
              </div>
            ) : (
              <VirtuosoGrid
                style={{
                  height: "100%",
                  scrollBehavior: "auto",
                  WebkitOverflowScrolling: "touch",
                }}
                totalCount={messages.length}
                overscan={200}
                increaseViewportBy={{ top: 1000, bottom: 1000 }}
                computeItemKey={(index) => messages[index]?._id}
                components={{
                  ...gridComponents,
                  Footer: () => (
                    <div className="flex items-center justify-center py-4 w-full">
                      {isLoadingMore ? (
                        <div className="w-6 h-6 border-3 border-[#FFD44F] border-t-[#5D3014] rounded-full animate-spin"></div>
                      ) : pagination.has_next ? (
                        <span className="text-[#5D3014] text-sm">
                          Scroll for more
                        </span>
                      ) : null}
                    </div>
                  ),
                }}
                itemContent={(index) => {
                  const msg = messages[index];
                  const isBeingDeleted = deletingMessageIds.includes(msg._id);
                  return (
                    <Link href={`/beg/${msg._id}`} className="w-full">
                      <div
                        className={`flex flex-col gap-1 items-start justify-start w-full transition-opacity duration-300 ${
                          isBeingDeleted
                            ? "opacity-50 pointer-events-none"
                            : "opacity-100"
                        } ${msg.isNew ? "message-bump" : ""}`}
                      >
                        <div className="p-3 w-full mx-auto border border-[#8F95B2] rounded-[8px] bg-white lg:h-[220px] flex flex-col  hover:shadow-[0px_2px_8px_rgba(93,48,20,0.4)] hover:rounded-[8px] cursor-pointer">
                          <div className="flex flex-col gap-2 items-start justify-between h-full">
                            <div className="w-full flex-col flex items-start gap-2">
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-1 text-[#5D3014]">
                                  <img
                                    src={getFlagIcon(msg.voiceType)}
                                    alt={msg.voiceType.toLowerCase()}
                                    className="w-5 h-5 sm:w-6 sm:h-6"
                                  />
                                  <a
                                    href={`/profile/${msg.walletAddress}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                    }}
                                    className="font-[Montserrat] text-[#5D3014] font-medium text-[12px] hover:underline"
                                  >
                                    {msg.walletAddress.slice(0, 4)}...
                                    {msg.walletAddress.slice(-4)}
                                  </a>
                                  <div className="w-1 h-1 rounded-full bg-[#FFD44F] flex-shrink-0" />
                                  <span className="font-[Montserrat] font-medium text-[12px] text-[#5D3014]">
                                    {formatMessageTime(msg.timestamp)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-center gap-2">
                                  {adminWallets.length &&
                                  connected &&
                                  adminWallets.includes(
                                    publicKey?.toBase58()!
                                  ) ? (
                                    <>
                                      <img
                                        src="/assets/delete-icon.svg"
                                        alt="delete"
                                        className="w-4 h-4 cursor-pointer"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          deleteBegMessage(msg._id);
                                        }}
                                      />
                                    </>
                                  ) : null}
                                  <PlayPauseButton
                                    text={msg.text}
                                    voiceId={msg.voiceId}
                                    className="flex-shrink-0"
                                  />
                                  <div
                                    className="relative"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      if (!connected) {
                                        toast.error("Connect wallet to react!");
                                        return;
                                      }
                                      setReactionsMessageId(
                                        reactionsMessageId === msg._id
                                          ? null
                                          : msg._id
                                      );
                                    }}
                                  >
                                    {reactionsMessageId === msg._id ? (
                                      <div className="absolute right-0 top-[120%] z-[9] rounded-[2000px] py-2 px-4 bg-[#FFEFBD] flex items-center gap-2 w-max">
                                        {reactions.map((r) => (
                                          <div
                                            key={r.val}
                                            className={`cursor-pointer flex-shrink-0 p-1 rounded-full border bg-white`}
                                            style={{
                                              borderColor: r.color,
                                              boxShadow: `1px 1px 0px 0px ${r.color}`,
                                            }}
                                            onClick={() => {
                                              reactToBegMessage(msg._id, r.val);
                                              setReactionsMessageId(null);
                                            }}
                                          >
                                            <img
                                              src={r.icon}
                                              alt={r.val}
                                              style={{
                                                width: "16px",
                                                height: "16px",
                                              }}
                                            />
                                          </div>
                                        ))}
                                      </div>
                                    ) : null}
                                    <img
                                      src="/assets/reactions-icon.svg"
                                      about="reaction"
                                      className="w-6 h-6 rounded-full cursor-pointer shadow-[0px_4px_8px_0px_rgba(0,0,0,0.25)]"
                                    />
                                  </div>
                                </div>
                              </div>
                              <div className="w-full flex items-start gap-2 flex-grow">
                                {msg.imageUrl ? (
                                  // Check if it's a video by extension
                                  isVideoUrl(msg.imageUrl) ? (
                                    <div
                                      className="relative w-[80px] h-[80px] flex-shrink-0 rounded-[4px] cursor-pointer overflow-hidden"
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
                                      className="w-[80px] h-[80px] flex-shrink-0 object-cover rounded-[4px] cursor-pointer"
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
                                  setIsExpanded={(val) => {
                                    setIsMessageExpanded(val);
                                    setExpandedMessage(msg.text);
                                  }}
                                />
                              </div>
                            </div>
                            <div className="w-full flex-col flex items-start gap-4 mt-auto">
                              <div className="flex items-center justify-start gap-2 w-full">
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
                              {msg.begStatus === "completed" ? (
                                <div className="rounded-[8px] h-full w-full px-4 py-1 border border-black flex items-center gap-2 bg-[#FFD44F] shadow-[inset_0px_4px_8px_0px_rgba(0,0,0,0.25)]">
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
                              ) : (
                                <div
                                  className="w-full"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                  }}
                                >
                                  <DonateButton
                                    handleDonate={handleDonate}
                                    donatingMessageId={donatingMessageId}
                                    msg={msg}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        {msg.reactions && Object.keys(msg.reactions).length ? (
                          <div className="flex items-center justify-start gap-2">
                            {reactions.map((r) =>
                              msg.reactions[
                                r.val as keyof typeof msg.reactions
                              ] ? (
                                <div
                                  key={r.val}
                                  className={`flex-shrink-0 p-1 rounded-full border bg-white flex items-center gap-1 cursor-pointer`}
                                  style={{
                                    borderColor: r.color,
                                    boxShadow: `1px 1px 0px 0px ${r.color}`,
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    if (!connected) {
                                      toast.error("Connect wallet to react!");
                                      return;
                                    }
                                    reactToBegMessage(msg._id, r.val);
                                    setReactionsMessageId(null);
                                  }}
                                >
                                  <img
                                    src={r.icon}
                                    alt={r.val}
                                    style={{
                                      width: "16px",
                                      height: "16px",
                                    }}
                                  />
                                  <p className="font-[Montserrat] text-[12px] text-black">
                                    {
                                      msg.reactions[
                                        r.val as keyof typeof msg.reactions
                                      ]
                                    }
                                  </p>
                                </div>
                              ) : null
                            )}
                          </div>
                        ) : null}
                      </div>
                    </Link>
                  );
                }}
                endReached={() => {
                  if (pagination.has_next && !isLoadingMore) {
                    fetchMoreMessages();
                  }
                }}
              />
            )}
          </div>

          {/* Mobile Input area */}
          <div className="block lg:hidden w-full mx-auto">
            {isInputAreaOpen ? (
              <CreateBegForm
                isMobile={true}
                onClose={() => {
                  setIsInputAreaOpen(false);
                  if (!connected) setWalletAddress("");
                }}
                onSendMessage={(messageData) => {
                  websocket?.send(JSON.stringify(messageData));
                  const updateUserBeg = {
                    action: "updateBegUserInfo",
                    walletAddress: contextUserData?.walletAddress,
                    updates: {
                      totalBegs: (contextUserData?.totalBegs || 0) + 1,
                    },
                  };
                  websocket?.send(JSON.stringify(updateUserBeg));
                  if (!connected) setWalletAddress("");
                  setIsInputAreaOpen(false);

                  // Start cooldown after sending message
                  setIsInCooldown(true);
                  setCooldownSeconds(COOLDOWN_DURATION);
                }}
                isInCooldown={isInCooldown}
                cooldownSeconds={cooldownSeconds}
              />
            ) : (
              <div className="py-3 px-4 sm:py-4 sm:px-6 rounded-[8px] bg-[#FFD44F] w-full mx-auto">
                <button
                  onClick={() => setIsInputAreaOpen(true)}
                  className="w-full h-[36px] sm:h-[40px] flex items-center justify-center cursor-pointer gap-2 bg-black text-[#FFD44F] text-[14px] sm:text-[16px] rounded-[8px] outline-none border-none"
                >
                  <img
                    src="/assets/bolt-icon.svg"
                    alt="bolt"
                    className="w-3 h-3 sm:w-4 sm:h-4"
                  />
                  <span className="text-[#FFD44F]">BEG</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}
      <SocialLinks isMobile={true} />
      <Modal
        isOpen={isMessageExpanded}
        onClose={() => setIsMessageExpanded(false)}
      >
        <div className="text-[14px] sm:text-[16px] break-all text-black">
          {expandedMessage}
        </div>
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
      <Modal
        isOpen={openCreateBegModal}
        onClose={() => setOpenCreateBegModal(false)}
      >
        <CreateBegForm
          onClose={() => setOpenCreateBegModal(false)}
          onSendMessage={(messageData) => {
            websocket?.send(JSON.stringify(messageData));

            const updateUserBeg = {
              action: "updateBegUserInfo",
              walletAddress: contextUserData?.walletAddress,
              updates: {
                totalBegs: (contextUserData?.totalBegs || 0) + 1,
              },
            };
            websocket?.send(JSON.stringify(updateUserBeg));
            if (!connected) setWalletAddress("");
            setOpenCreateBegModal(false);

            // Start cooldown after sending message
            setIsInCooldown(true);
            setCooldownSeconds(COOLDOWN_DURATION);
          }}
          isInCooldown={isInCooldown}
          cooldownSeconds={cooldownSeconds}
        />
      </Modal>
    </>
  );
}
