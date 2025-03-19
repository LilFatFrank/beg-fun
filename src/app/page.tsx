"use client";
import React, { CSSProperties } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import { motion } from "framer-motion";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { LAMPORTS_PER_SOL, SystemProgram, Transaction } from "@solana/web3.js";
import { format, isToday, parseISO } from "date-fns";
import { Switch } from "@/components/Switch";
import { toast } from "sonner";
import Link from "next/link";
import LiveChat from "@/components/LiveChat";

const solAmounts = ["0.1", "0.5", "1", "5", "10", "100"];

const voiceTypes = ["Indian", "Nigerian", "Chinese"];

const voiceIds = {
  Indian: [
    "CRIElKBddWiknSUmfeak",
    "05QRrdNgiglhuYOaTQvw",
    "LKs6V6ilINRR5OoPi0bP",
    "LSEq6jBkWbldjNhcDwT1",
    "UxeNKVidAPGOtgg3CLBB",
  ],
  Nigerian: [
    "KfOKur2SDMsqQVcT1wKb",
    "neMPCpWtBwWZhxEC8qpe",
    "NVp9wQor3NDIWcxYoZiW",
    "ddDFRErfhdc2asyySOG5",
  ],
  Chinese: ["mbL34QDB5FptPamlgvX5"],
};

const getRandomVoiceType = () => {
  // 60% chance to select Indian voice type
  const indianBias = 0.6;

  if (Math.random() < indianBias) {
    return "Indian";
  } else {
    // For the remaining 30%, choose randomly between Nigerian and Chinese
    const otherTypes = voiceTypes.filter((type) => type !== "Indian");
    const randomIndex = Math.floor(Math.random() * otherTypes.length);
    return otherTypes[randomIndex];
  }
};

const getRandomVoiceId = (voiceType: string) => {
  const availableVoices = voiceIds[voiceType as keyof typeof voiceIds];
  if (Array.isArray(availableVoices)) {
    const randomIndex = Math.floor(Math.random() * availableVoices.length);
    return availableVoices[randomIndex];
  }
  return availableVoices; // For Chinese which is a single string
};

const getFlagIcon = (voiceType: string) => {
  switch (voiceType) {
    case "Indian":
      return "/assets/india-flag-icon.svg";
    case "Nigerian":
      return "/assets/nigeria-flag-icon.svg";
    case "Chinese":
      return "/assets/china-flag-icon.svg";
    default:
      return "/assets/india-flag-icon.svg";
  }
};

const detectSolanaAddress = (add: string) => {
  try {
    const publicKey = new PublicKey(add);
    // Check if the public key is on the ed25519 curve
    if (!PublicKey.isOnCurve(publicKey.toBytes())) {
      return false;
    }
    return true;
  } catch (error) {
    return false;
  }
};

const PlayPauseButton = ({
  text,
  voiceId,
  className,
}: {
  text: string;
  voiceId: string;
  className?: string;
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handlePlayPause = async () => {
    if (isLoading) return;

    if (audio) {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        audio.play();
        setIsPlaying(true);
      }
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: "POST",
          headers: {
            Accept: "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || "",
          },
          body: JSON.stringify({
            text,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.5,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      const newAudio = new Audio(url);

      newAudio.addEventListener("ended", () => {
        setIsPlaying(false);
      });

      newAudio.addEventListener("pause", () => {
        setIsPlaying(false);
      });

      setAudio(newAudio);
      newAudio.play();
      setIsPlaying(true);
    } catch (error) {
      console.error("Error generating speech:", error);
      toast.error("Error generating speech");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (audio) {
        audio.pause();
        URL.revokeObjectURL(audio.src);
      }
    };
  }, [audio]);

  return (
    <motion.button
      onClick={handlePlayPause}
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={className}
      disabled={isLoading}
    >
      {isLoading ? (
        <div className="w-5 h-5 sm:w-6 sm:h-6">
          <div className="animate-spin rounded-full h-full w-full border-b-2 border-[#5D3014]"></div>
        </div>
      ) : (
        <img
          src={isPlaying ? "/assets/pause-icon.svg" : "/assets/play-icon.svg"}
          alt={isPlaying ? "pause" : "play"}
          className="w-5 h-5 sm:w-6 sm:h-6"
          style={{ filter: "drop-shadow(0px 4px 12px rgba(93, 48, 20, 0.4))" }}
        />
      )}
    </motion.button>
  );
};

const Modal = ({
  isOpen,
  onClose,
  children,
  preventClose = false,
  style,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  preventClose?: boolean;
  style?: CSSProperties;
}) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !preventClose) onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose, preventClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-50"
      style={{ backgroundColor: "rgba(93, 48, 20, 0.88)" }}
      onClick={preventClose ? undefined : onClose}
    >
      <div
        className="bg-[#FFD44F] w-full max-w-[540px] p-4 rounded-[8px] border border-[#FF9933] max-h-[80vh] overflow-y-auto"
        style={{ ...style }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

const DonateModal = ({
  isOpen,
  onClose,
  solAmount,
  fillAmount,
  onDonate,
  isDonating,
}: {
  isOpen: boolean;
  onClose: () => void;
  solAmount: string;
  fillAmount: string;
  onDonate: (amount: string) => void;
  isDonating: boolean;
}) => {
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const connection = new Connection(process.env.NEXT_PUBLIC_RPC!);

  useEffect(() => {
    const fetchBalance = async () => {
      if (publicKey) {
        const balance = await connection.getBalance(publicKey);
        setBalance(balance / LAMPORTS_PER_SOL);
      }
    };
    fetchBalance();
  }, [publicKey]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      preventClose={isDonating}
      style={{ background: "#ffffff", maxWidth: "360px" }}
    >
      <div className="flex flex-col">
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
                {balance?.toFixed(2) || "0.00"} SOL
              </span>
            </div>
          </div>
        </div>
        <div className="relative w-full h-[24px] bg-[#FFD44F] rounded-[200px] overflow-hidden border border-[#FF9933] mt-2">
          <div
            className="absolute top-0 left-0 h-full bg-[#009A49] transition-all duration-300"
            style={{
              width: `${Math.min(
                100,
                (Number(fillAmount) / Number(solAmount)) * 100
              )}%`,
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
                {Number(fillAmount).toFixed(4)} / {solAmount} sol
              </span>
            </div>
          </div>
        </div>
        <div className="w-[60%] bg-gradient-to-r from-[#000000] to-[#ffffff] h-[1px] mt-[12px] mb-[16px]" />
        <div className="w-full rounded-[8px] bg-white">
          <div className="flex items-center gap-2 mb-1">
            <img
              src="/assets/solana-black-icon.svg"
              alt="solana"
              className="w-6 h-6"
            />
            <input
              placeholder="sol amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="any"
              type="number"
              className="w-full outline-none border-none text-[16px] pr-2 remove-arrow placeholder:text-[#8F95B2] text-black"
            />
          </div>
        </div>
        <div className="w-[60%] bg-gradient-to-r from-[#000000] to-[#ffffff] h-[1px] mt-[12px] mb-[16px]" />
        <button
          onClick={() => onDonate(amount)}
          disabled={!amount || isDonating}
          className="h-[48px] w-full flex items-center justify-center cursor-pointer gap-2 bg-black text-[#FFD44F] text-[16px] rounded-[8px] outline-none border-none disabled:opacity-[0.6] disabled:cursor-not-allowed"
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
    </Modal>
  );
};

const MessageText = ({ text }: { text: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = textRef.current;
    const measureElement = measureRef.current;
    if (element && measureElement) {
      // First measure without line-clamp to see if it would overflow
      const lineHeight = parseInt(
        window.getComputedStyle(measureElement).lineHeight
      );
      const wouldOverflow = measureElement.scrollHeight > lineHeight * 2;
      setHasOverflow(wouldOverflow);
    }
  }, [text]);

  return (
    <>
      <div className="relative w-full">
        {/* Hidden element to measure overflow */}
        <div
          ref={measureRef}
          className="text-black text-[12px] sm:text-[14px] break-all absolute opacity-0 pointer-events-none"
          style={{ width: "100%" }}
        >
          {text}
        </div>
        {/* Visible element with truncation */}
        <div
          ref={textRef}
          className={`text-[12px] sm:text-[14px] break-all line-clamp-2 text-black`}
        >
          {text}
          {hasOverflow && (
            <button
              onClick={() => setIsExpanded(true)}
              className="absolute bottom-0 font-bold cursor-pointer right-0 bg-white pl-1 text-[12px] sm:text-[14px] text-[#5D3014] hover:underline"
            >
              ...view more
            </button>
          )}
        </div>
      </div>
      <Modal isOpen={isExpanded} onClose={() => setIsExpanded(false)}>
        <div className="text-[14px] sm:text-[16px] break-all text-black">
          {text}
        </div>
      </Modal>
    </>
  );
};

const formatMessageTime = (timestamp: string) => {
  try {
    // Parse the UTC ISO timestamp
    const date = parseISO(timestamp);

    if (isNaN(date.getTime())) {
      throw new Error("Invalid date");
    }

    // Convert UTC to local time by adding the timezone offset
    const localDate = new Date(
      date.getTime() - date.getTimezoneOffset() * 60000
    );

    if (isToday(localDate)) {
      return format(localDate, "h:mma").toLowerCase(); // Formats like "10:11am"
    }
    return format(localDate, "do MMM ''yy"); // Formats like "15th Jan '25"
  } catch (error) {
    console.error("Error formatting date:", error);
    return timestamp; // Return original timestamp if parsing fails
  }
};

export default function Home() {
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
    }[]
  >([]);
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
  const [walletAddress, setWalletAddress] = useState("");
  const [messageText, setMessageText] = useState("");
  const [solAmount, setSolAmount] = useState("");
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [lastActive, setLastActive] = useState<number>(Date.now());
  const [musicEnabled, setMusicEnabled] = useState(true);
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const websocketRetries = useRef(0);
  const idleCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [isInCooldown, setIsInCooldown] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [mobileMcdViewOpen, setMobileMcdViewOpen] = useState(false);
  const [liveChatOpen, setLiveChatOpen] = useState(false);
  const { publicKey, sendTransaction, connected, disconnect } = useWallet();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [donatingMessageId, setDonatingMessageId] = useState<string | null>(
    null
  );
  const [isInputAreaOpen, setIsInputAreaOpen] = useState(false);
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

  const connection = new Connection(process.env.NEXT_PUBLIC_RPC!);

  const adminWallets = process.env.NEXT_PUBLIC_ADMIN_WALLETS
    ? process.env.NEXT_PUBLIC_ADMIN_WALLETS.split(",")
    : [];

  const MIN_WORDS = 6;
  const MAX_WORDS = 200;
  const COOLDOWN_DURATION = 60;

  const getWordCount = (text: string) => {
    return text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
  };

  // Function to fetch initial messages
  const fetchInitialMessages = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `https://7dfinzalu3.execute-api.ap-south-1.amazonaws.com/dev/?method=get_beg_messages&page=1&limit=${pagination.limit}`
      );
      const data = await response.json();
      setMessages(
        data.messages
          .map((d: any) => ({
            walletAddress: d.walletAddress,
            text: d.text,
            solAmount: d.solAmount,
            _id: d._id,
            begStatus: d.begStatus,
            timestamp: d.timestamp,
            voiceType: d.voiceType || "Indian",
            voiceId: d.voiceId || voiceIds.Indian[0],
            fillAmount: d.fillAmount || "0",
          }))
          .reverse()
      );
      setPagination(data.pagination);
      console.log("Messages refreshed");
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

      // Store the current scroll position
      const container = document.getElementById("messages-container");
      if (!container) return;
      const oldScrollTop = container.scrollTop;

      const response = await fetch(
        `https://7dfinzalu3.execute-api.ap-south-1.amazonaws.com/dev/?method=get_beg_messages&page=${nextPage}&limit=${pagination.limit}`
      );
      const data = await response.json();

      setMessages((prevMessages) => [
        ...data.messages
          .map((d: any) => ({
            walletAddress: d.walletAddress,
            text: d.text,
            solAmount: d.solAmount,
            _id: d._id,
            begStatus: d.begStatus,
            timestamp: d.timestamp,
            voiceType: d.voiceType || "Indian",
            voiceId: d.voiceId || voiceIds.Indian[0],
            fillAmount: d.fillAmount || "0",
          }))
          .reverse(),
        ...prevMessages,
      ]);
      setPagination(data.pagination);

      // After state updates, restore the exact same scroll position
      requestAnimationFrame(() => {
        container.scrollTop = oldScrollTop;
      });
    } catch (error) {
      toast.error("Error loading more messages");
      console.error("Error loading more messages:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [pagination.has_next, pagination.page, pagination.limit, isLoadingMore]);

  const setupWebSocket = useCallback(() => {
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    if (websocketRef.current) {
      websocketRef.current.close();
    }

    websocketRef.current = new WebSocket(
      "wss://q1qqf9y8gb.execute-api.ap-south-1.amazonaws.com/dev/"
    );

    websocketRef.current.onopen = () => {
      console.log("WebSocket connection established");
      websocketRetries.current = 0; // Reset retry counter on successful connection
      pingIntervalRef.current = setInterval(() => {
        if (websocketRef.current?.readyState === WebSocket.OPEN) {
          websocketRef.current.send(JSON.stringify({ type: "ping" }));
        }
      }, 30000);
    };

    websocketRef.current.onmessage = (event) => {
      try {
        const receivedMessage = JSON.parse(event.data);

        if (
          receivedMessage.type === "begMessage" ||
          receivedMessage.type === "begMessageConfirmation"
        ) {
          // Handle new beg messages and check for duplicates
          setMessages((prevMessages) => {
            // Check if message with this ID already exists
            const messageExists = prevMessages.some(
              (msg) => msg._id === receivedMessage.message_id
            );
            if (messageExists) {
              return prevMessages; // Don't add duplicate message
            }

            // Add new message
            return [
              ...prevMessages,
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
              },
            ];
          });
        }
        // Handle message updates
        else if (
          receivedMessage.type === "begMessageUpdate" ||
          receivedMessage.type === "begMessageUpdateConfirmation"
        ) {
          toast.success(
            `Donation of ${Number(receivedMessage.fillAmount).toFixed(
              4
            )} sol successful!`
          );
          // Update an existing message
          setMessages((prevMessages) =>
            prevMessages.map((message) =>
              message._id === receivedMessage.message_id
                ? {
                    ...message,
                    begStatus: receivedMessage.begStatus,
                    fillAmount: receivedMessage.fillAmount || "0",
                  }
                : message
            )
          );
        } else if (
          receivedMessage.type === "begMessageDeleted" ||
          receivedMessage.type === "begMessageDeletedConfirmation"
        ) {
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
        }
      } catch (error) {
        toast.error("Error parsing message");
        console.error("Error parsing message:", error);
      }
    };

    websocketRef.current.onclose = () => {
      console.log("WebSocket connection closed");
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }

      setTimeout(() => {
        console.log("Reconnecting WebSocket...");
        setupWebSocket();
      }, Math.min(1000 * Math.pow(2, websocketRetries.current++), 30000));
    };

    websocketRef.current.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  }, []);

  const handleSendMessage = useCallback(() => {
    try {
      if (isInCooldown) {
        toast.error(
          `Please wait ${cooldownSeconds}s before sending another message`
        );
        return;
      }

      if (!messageText.trim()) {
        toast.error("Please enter a message");
        return;
      }

      const words = getWordCount(messageText);
      if (words < MIN_WORDS) {
        toast.error(`Message must be at least ${MIN_WORDS} words`);
        return;
      }

      if (words > MAX_WORDS) {
        toast.error(`Message cannot exceed ${MAX_WORDS} words`);
        return;
      }

      if (!walletAddress.trim()) {
        toast.error("Please enter a wallet address");
        return;
      }

      if (!solAmount.trim()) {
        toast.error("Please enter a SOL amount");
        return;
      }

      if (websocketRef.current?.readyState !== WebSocket.OPEN) {
        toast.error("Connection error. Please try again.");
        return;
      }

      const selectedVoiceType = getRandomVoiceType();
      const selectedVoiceId = getRandomVoiceId(selectedVoiceType);

      const messageData = {
        action: "sendBegMessage",
        walletAddress: walletAddress,
        text: messageText,
        solAmount: solAmount,
        begStatus: "pending",
        voiceType: selectedVoiceType,
        voiceId: selectedVoiceId,
      };

      websocketRef.current.send(JSON.stringify(messageData));

      setMessageText("");
      if (!connected) setWalletAddress("");
      setSolAmount("");

      // Start cooldown
      setIsInCooldown(true);
      setCooldownSeconds(COOLDOWN_DURATION);
    } catch (error) {
      toast.error("Error sending message");
      console.log(error);
    }
  }, [
    walletAddress,
    messageText,
    solAmount,
    isInCooldown,
    cooldownSeconds,
    connected,
  ]);

  const deleteBegMessage = (messageId: string) => {
    try {
      if (
        websocketRef.current &&
        websocketRef.current.readyState === WebSocket.OPEN
      ) {
        websocketRef.current.send(
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

  const copyText = useCallback(async (address: string, messageId: string) => {
    await navigator.clipboard.writeText(address ?? "");
    setCopiedMessageId(messageId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  }, []);

  // Setup WebSocket connection
  useEffect(() => {
    setupWebSocket();

    // Cleanup function when component unmounts
    return () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }

      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
  }, [setupWebSocket]);

  // Handle user activity tracking
  useEffect(() => {
    // Update last active timestamp on user interaction
    const handleActivity = () => {
      setLastActive(Date.now());
    };

    // Track visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Refresh data when tab becomes visible again
        fetchInitialMessages();
      }
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
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      // Clean up event listeners
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("scroll", handleActivity);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      if (idleCheckIntervalRef.current) {
        clearInterval(idleCheckIntervalRef.current);
      }
    };
  }, [lastActive, fetchInitialMessages]);

  // Fetch initial messages on load
  useEffect(() => {
    fetchInitialMessages();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  // Initialize music from localStorage
  useEffect(() => {
    const savedMusic = localStorage.getItem("autoplay-beg-music");

    if (savedMusic === null) {
      localStorage.setItem("autoplay-beg-music", "true");
    } else {
      setMusicEnabled(savedMusic === "true");
    }
  }, []);

  // Populate wallet address when connected
  useEffect(() => {
    if (publicKey) {
      setWalletAddress(publicKey.toBase58());
    } else {
      setWalletAddress("");
    }
  }, [publicKey]);

  const handleMusicChange = (checked: boolean) => {
    setMusicEnabled(checked);
    localStorage.setItem("autoplay-beg-music", String(checked));
    if (bgMusicRef.current) {
      if (checked) {
        bgMusicRef.current.play().catch((error) => {
          console.log("Background music autoplay prevented:", error);
        });
      } else {
        bgMusicRef.current.pause();
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const words = getWordCount(text);
    if (words <= MAX_WORDS) {
      setMessageText(text);
      setWordCount(words);
    }
  };

  const begDisabled = useMemo(() => {
    const words = getWordCount(messageText);
    return (
      !messageText ||
      words < MIN_WORDS ||
      words > MAX_WORDS ||
      !solAmount ||
      (walletAddress && !detectSolanaAddress(walletAddress)) ||
      !walletAddress ||
      isInCooldown
    );
  }, [messageText, solAmount, walletAddress, isInCooldown]);

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

      const transferAmount = Number(amount) * LAMPORTS_PER_SOL;
      const fee_percent = 1;

      const toPubkey = new PublicKey(recipientAddress);
      const feePubkey = new PublicKey(
        process.env.NEXT_PUBLIC_BEG_ADMIN_ACCOUNT!
      );

      const lamports = Math.round(transferAmount);
      const sendAmount = Math.round((lamports * (100 - fee_percent)) / 100);
      const feeAmount = Math.round((lamports * fee_percent) / 100);

      const transaction = new Transaction();

      // Get fresh blockhash
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash("finalized");
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      transaction.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey,
          lamports: sendAmount,
        }),
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: feePubkey,
          lamports: feeAmount,
        })
      );

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

      websocketRef.current?.send(
        JSON.stringify({
          action: "updateBegMessage",
          messageId,
          walletAddress,
          updates: {
            begStatus: isFilled ? "completed" : "pending",
            fillAmount: newFillAmount.toString(),
          },
        })
      );
    } catch (error) {
      toast.error("Could not make donation!");
      console.log("Transaction error:", error);
    } finally {
      setDonatingMessageId(null);
    }
  };

  // Initialize background music
  useEffect(() => {
    const audio = new Audio("/assets/beg-bg.mp3");
    audio.loop = true;
    audio.volume = 0.15; // Set volume to 25%
    bgMusicRef.current = audio;

    // Start playing when component mounts only if music is enabled
    const playMusic = () => {
      if (bgMusicRef.current && musicEnabled) {
        bgMusicRef.current.play().catch((error) => {
          console.log("Background music autoplay prevented:", error);
        });
      }
    };

    // Try to play immediately if music is enabled
    playMusic();

    // Also try to play on first user interaction if music is enabled
    const handleFirstInteraction = () => {
      if (musicEnabled) {
        playMusic();
      }
      // Remove the event listeners after first interaction
      document.removeEventListener("click", handleFirstInteraction);
      document.removeEventListener("touchstart", handleFirstInteraction);
    };

    document.addEventListener("click", handleFirstInteraction);
    document.addEventListener("touchstart", handleFirstInteraction);

    // Cleanup
    return () => {
      if (bgMusicRef.current) {
        bgMusicRef.current.pause();
        bgMusicRef.current = null;
      }
      document.removeEventListener("click", handleFirstInteraction);
      document.removeEventListener("touchstart", handleFirstInteraction);
    };
  }, [musicEnabled]); // Add musicEnabled as a dependency

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

  return (
    <>
      <div className="container h-[calc(100vh-40px)] mx-auto flex flex-col">
        {/* Main container with 3 columns */}
        <div className="flex gap-4 md:gap-6 lg:gap-[48px] py-[20px] md:py-[40px] max-md:px-[20px] flex-1 h-full">
          {/* Left section - hidden on mobile */}
          <div className="hidden lg:block w-[27%] overflow-y-auto">
            <div className="flex flex-col items-center justify-center">
              <img
                src="/assets/logo-icon.svg"
                alt="logo"
                className="w-[80px] h-[80px]"
              />
              <p className="text-[40px] leading-tight text-[#5D3014]">
                BegsFun
              </p>
              <p className="text-[20px] mb-2 md:mb-4 text-[#5D3014]">
                please send me 1 sol bro
              </p>
            </div>
            <div className="mb-6 flex flex-col items-start gap-4 p-4 rounded-[8px] bg-[#FFD44F] w-full border border-[#FF9933]">
              <RoadMapInfo />
            </div>
            <AudioOptions
              musicEnabled={musicEnabled}
              handleMusicChange={handleMusicChange}
            />
          </div>

          {/* Center section - main content */}
          <div className="w-full lg:w-[46%] flex flex-col">
            <>
              <div className="relative flex items-center justify-between w-full mb-4">
                <div className="lg:hidden">
                  <div className="flex items-center justify-center gap-1">
                    <img
                      src="/assets/logo-icon.svg"
                      alt="logo"
                      className="w-10 h-10"
                    />
                    <p className="text-[20px] leading-tight text-[#5D3014]">
                      BegsFun
                    </p>
                  </div>
                  <p className="text-[12px] text-[#5D3014] leading-tight mt-[-2px]">
                    please send me 1 sol bro
                  </p>
                </div>
                <div className="flex lg:hidden items-center justify-center gap-1">
                  {liveChatOpen ? null : (
                    <>
                      {connected ? (
                        <div className="flex lg:hidden items-center justify-center gap-1 h-6">
                          <ConnectedState
                            address={publicKey?.toBase58() ?? ""}
                            disconnect={disconnect}
                            isMobile={true}
                          />
                        </div>
                      ) : (
                        <div className="flex lg:hidden items-center justify-center">
                          <ConnectButton isMobile={true} />
                        </div>
                      )}
                      <span
                        className="lg:hidden"
                        onClick={() => setMobileMcdViewOpen(!mobileMcdViewOpen)}
                      >
                        <img
                          src={
                            mobileMcdViewOpen
                              ? "/assets/mobile-close-icon.svg"
                              : "/assets/mobile-mcd-icon.svg"
                          }
                          alt={mobileMcdViewOpen ? "close" : "mcd"}
                          className="w-6 h-6"
                          style={{
                            filter:
                              "drop-shadow(0px 4px 8px rgba(93, 48, 20, 0.4))",
                          }}
                        />
                      </span>
                    </>
                  )}
                  <span
                    className="lg:hidden"
                    onClick={() => setLiveChatOpen(!liveChatOpen)}
                  >
                    <img
                      src={
                        liveChatOpen
                          ? "/assets/mobile-close-icon.svg"
                          : "/assets/chat-icon.svg"
                      }
                      alt={liveChatOpen ? "close" : "mcd"}
                      className="w-6 h-6"
                      style={{
                        filter:
                          "drop-shadow(0px 4px 8px rgba(93, 48, 20, 0.4))",
                      }}
                    />
                  </span>
                </div>
              </div>
              {liveChatOpen ? (
                <LiveChat />
              ) : mobileMcdViewOpen ? (
                <div className="overflow-y-auto">
                  <AudioOptions
                    musicEnabled={musicEnabled}
                    handleMusicChange={handleMusicChange}
                    isMobile={true}
                  />
                  <div className="mb-4 flex flex-col items-start gap-4 p-4 rounded-[8px] bg-[#FFD44F] w-full border border-[#FF9933]">
                    <RoadMapInfo />
                  </div>
                </div>
              ) : process.env.NEXT_PUBLIC_ERROR_SCREEN ? (
                <>
                  <div className="grow flex flex-col items-center justify-center gap-2">
                    <p className="text-[#5D3014] text-[64px] font-bold leading-tight">
                      Fixing Things 🧰
                    </p>
                    <p className="text-[#5D3014] font-medium">
                      Working on a few updates to improve your begging
                      experience.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  {/* Messages container */}
                  <div
                    className="grow flex-1 flex flex-col-reverse overflow-y-auto py-4"
                    id="messages-container"
                  >
                    <div className="flex-1 flex flex-col justify-end">
                      {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="w-8 h-8 border-4 border-[#FFD44F] border-t-[#5D3014] rounded-full animate-spin"></div>
                        </div>
                      ) : (
                        <>
                          {pagination.has_next && (
                            <div
                              ref={loadMoreRef}
                              className="flex items-center justify-center py-4"
                            >
                              {isLoadingMore ? (
                                <div className="w-6 h-6 border-3 border-[#FFD44F] border-t-[#5D3014] rounded-full animate-spin"></div>
                              ) : (
                                <span className="text-[#5D3014] text-sm">
                                  Scroll for more
                                </span>
                              )}
                            </div>
                          )}
                          {messages.map((msg, index) => (
                            <div
                              key={`${msg._id}-${index}`}
                              className="mb-4 p-3 sm:p-4 w-full mx-auto border border-[#FF9933] rounded-[8px] bg-white"
                            >
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1 sm:gap-2 text-[#5D3014]">
                                    <img
                                      src={getFlagIcon(msg.voiceType)}
                                      alt={msg.voiceType.toLowerCase()}
                                      className="w-5 h-5 sm:w-6 sm:h-6"
                                    />
                                    <span className="font-[Montserrat] text-[#5D3014] font-medium text-[12px] sm:text-[14px]">
                                      {msg.walletAddress.slice(0, 4)}...
                                      {msg.walletAddress.slice(-4)}
                                    </span>
                                    <span>
                                      <motion.button
                                        onClick={() =>
                                          copyText(msg.walletAddress, msg._id)
                                        }
                                        whileTap={{ scale: 0.9 }}
                                        whileHover={{ scale: 1.1 }}
                                        transition={{
                                          type: "spring",
                                          stiffness: 300,
                                          damping: 20,
                                        }}
                                      >
                                        {copiedMessageId === msg._id ? (
                                          <p
                                            style={{ color: "#5D3014" }}
                                            className="text-[10px] sm:text-[12px] leading-3 flex items-center justify-center font-medium font-sofia-semibold"
                                          >
                                            copied!
                                          </p>
                                        ) : (
                                          <div className="mt-[2px] cursor-pointer">
                                            <CopyIcon
                                              color={"#5D3014"}
                                              width="10"
                                              height="10"
                                              className="sm:w-[12px] sm:h-[12px]"
                                            />
                                          </div>
                                        )}
                                      </motion.button>
                                    </span>
                                    <div className="w-1 h-1 rounded-full bg-[#FFD44F]" />
                                    <span className="font-[Montserrat] font-medium text-[12px] sm:text-[14px] text-[#5D3014]">
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
                                          onClick={() =>
                                            deleteBegMessage(msg._id)
                                          }
                                        />
                                      </>
                                    ) : null}
                                    <span className="flex items-center justify-center gap-[2px]">
                                      <img
                                        src="/assets/solana-brown-icon.svg"
                                        alt="solana"
                                        className="w-4 h-4"
                                      />
                                      <span className="font-[Montserrat] font-medium text-[#5D3014] text-[12px] sm:text-[14px]">
                                        {msg.solAmount} sol
                                      </span>
                                    </span>
                                    {msg.begStatus === "completed" ? (
                                      <div className="hidden rounded-[8px] h-full px-4 py-1 border border-black lg:flex items-center justify-center gap-2 bg-[#FFD44F] shadow-[inset_0px_4px_8px_0px_rgba(0,0,0,0.25)]">
                                        <img
                                          src="/assets/check-fulfilled-icon.svg"
                                          alt="solana"
                                          className="w-4 h-4"
                                        />
                                        <p className="text-[#5D3014] text-[14px]">
                                          Beg fulfilled
                                        </p>
                                      </div>
                                    ) : (
                                      <DonateButton
                                        handleDonateClick={handleDonateClick}
                                        donatingMessageId={donatingMessageId}
                                        msg={msg}
                                      />
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-start gap-1 sm:gap-2">
                                  <PlayPauseButton
                                    text={msg.text}
                                    voiceId={msg.voiceId}
                                    className="flex-shrink-0"
                                  />
                                  <MessageText text={msg.text} />
                                </div>
                                {msg.begStatus === "completed" ? (
                                  <div className="rounded-[8px] h-full w-full px-4 py-1 border border-black lg:hidden flex items-center gap-2 bg-[#FFD44F] shadow-[inset_0px_4px_8px_0px_rgba(0,0,0,0.25)]">
                                    <img
                                      src="/assets/check-fulfilled-icon.svg"
                                      alt="solana"
                                      className="w-4 h-4"
                                    />
                                    <p className="text-[#5D3014] text-[14px]">
                                      Beg fulfilled
                                    </p>
                                  </div>
                                ) : (
                                  <DonateButton
                                    handleDonateClick={handleDonateClick}
                                    donatingMessageId={donatingMessageId}
                                    msg={msg}
                                    isMobile={true}
                                  />
                                )}
                                <div className="relative w-full h-[24px] bg-[#FFD44F] rounded-[200px] overflow-hidden">
                                  <div
                                    className="absolute top-0 left-0 h-full bg-[#009A49] transition-all duration-300"
                                    style={{
                                      width: `${Math.min(
                                        100,
                                        (Number(msg.fillAmount) /
                                          Number(msg.solAmount)) *
                                          100
                                      )}%`,
                                    }}
                                  />
                                  <div className="absolute top-0 left-0 w-full h-full flex items-center justify-end">
                                    <div className="relative z-10 mr-[12px] text-[12px] font-medium">
                                      <span
                                        className="text-[#000000]"
                                        style={{
                                          color:
                                            (Number(msg.fillAmount) /
                                              Number(msg.solAmount)) *
                                              100 >=
                                            95
                                              ? "#FFFFFF"
                                              : "#000000",
                                        }}
                                      >
                                        {Number(msg.fillAmount).toFixed(4)} /{" "}
                                        {msg.solAmount} sol
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                          <div ref={messagesEndRef} />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Input area */}
                  <div className="py-3 px-4 sm:py-4 sm:px-6 rounded-[8px] bg-[#FFD44F] w-full mx-auto">
                    <div className="flex flex-col space-y-2">
                      {isInputAreaOpen && (
                        <>
                          <div className="relative">
                            <textarea
                              placeholder={
                                isInCooldown
                                  ? `Please wait ${cooldownSeconds}s before sending another message`
                                  : `enter your beg request (min. ${MIN_WORDS}, max. ${MAX_WORDS} words)`
                              }
                              value={messageText}
                              onChange={handleMessageChange}
                              onKeyDown={handleKeyPress}
                              disabled={isInCooldown}
                              className="p-2 rounded-[8px] bg-white resize-none text-[14px] sm:text-[16px] outline-none border-none w-full disabled:bg-gray-100 disabled:cursor-not-allowed placeholder:text-[#8F95B2] text-black"
                              rows={2}
                            />
                            <div className="absolute bottom-2 right-2 text-[10px] sm:text-[12px] text-gray-500">
                              {wordCount}/{MAX_WORDS}
                            </div>
                          </div>
                          <div className="flex-col-reverse flex items-center gap-2">
                            <div className="w-full rounded-[8px] bg-white p-2">
                              <div className="flex items-center gap-2 mb-1">
                                <img
                                  src="/assets/solana-black-icon.svg"
                                  alt="solana"
                                  className="w-5 h-5 sm:w-6 sm:h-6"
                                />
                                <input
                                  placeholder="sol amount"
                                  value={solAmount}
                                  onChange={(e) => setSolAmount(e.target.value)}
                                  step="any"
                                  type="number"
                                  className="w-full outline-none border-none text-[14px] sm:text-[16px] pr-2 remove-arrow placeholder:text-[#8F95B2] text-black"
                                />
                              </div>
                              <div className="flex items-center justify-start gap-1 flex-wrap">
                                {solAmounts.map((sa) => (
                                  <div
                                    key={sa}
                                    className={`p-2 rounded-[1000px] flex items-center gap-1 border cursor-pointer ${
                                      sa === solAmount
                                        ? "border-black bg-[#FFD44F]"
                                        : "border-[#FFD44F] bg-black"
                                    }`}
                                    onClick={() => setSolAmount(sa)}
                                  >
                                    <img
                                      src={
                                        sa === solAmount
                                          ? "/assets/solana-black-icon.svg"
                                          : "/assets/solana-yellow-icon.svg"
                                      }
                                      alt="sol"
                                      className="w-3 h-3"
                                    />
                                    <span
                                      className={`${
                                        sa === solAmount
                                          ? "text-black"
                                          : "text-[#FFD44F]"
                                      } text-[12px] leading-tight`}
                                    >
                                      {sa}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="w-full rounded-[8px] bg-white p-2 flex items-center gap-2">
                              <img
                                src="/assets/phantom-black-icon.svg"
                                alt="phantom"
                                className="w-5 h-5 sm:w-6 sm:h-6"
                              />
                              <input
                                type="text"
                                placeholder="sol address"
                                value={walletAddress}
                                onChange={(e) =>
                                  setWalletAddress(e.target.value)
                                }
                                className="w-full outline-none border-none text-[14px] sm:text-[16px] pr-2 placeholder:text-[#8F95B2] text-black"
                              />
                            </div>
                          </div>
                        </>
                      )}
                      <div className="flex items-center gap-2">
                        {isInputAreaOpen && (
                          <button
                            onClick={() => {
                              setIsInputAreaOpen(false);
                              setMessageText("");
                              setSolAmount("");
                              if (!connected) setWalletAddress("");
                            }}
                            className="h-[36px] sm:h-[40px] w-[36px] sm:w-[40px] flex items-center justify-center cursor-pointer bg-black text-[#FFD44F] text-[14px] sm:text-[16px] rounded-full outline-none border-none"
                          >
                            ✕
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (!isInputAreaOpen) {
                              setIsInputAreaOpen(true);
                            } else {
                              handleSendMessage();
                            }
                          }}
                          className="flex-1 h-[36px] sm:h-[40px] flex items-center justify-center cursor-pointer gap-2 bg-black text-[#FFD44F] text-[14px] sm:text-[16px] rounded-[8px] outline-none border-none"
                        >
                          <img
                            src="/assets/bolt-icon.svg"
                            alt="bolt"
                            className="w-3 h-3 sm:w-4 sm:h-4"
                          />
                          <span className="text-[#FFD44F]">BEG</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
              <SocialLinks isMobile={true} />
            </>
          </div>

          {/* Right section - hidden on mobile */}
          <div className="hidden lg:block w-[27%]">
            <div className="flex items-end justify-end flex-col gap-6 h-full">
              <div className="flex items-center gap-2 h-10">
                <img src="/assets/begs-token-icon.svg" alt="begs" />
                {connected ? (
                  <ConnectedState
                    address={publicKey?.toBase58() ?? ""}
                    disconnect={disconnect}
                  />
                ) : (
                  <ConnectButton />
                )}
              </div>
              <SocialLinks />
              <LiveChat />
            </div>
          </div>
        </div>
      </div>
      <div className="bg-[#FFD44F] h-[40px] flex items-center overflow-hidden whitespace-nowrap">
        <div className="flex w-fit animate-marquee">
          {/* First set of items */}
          {process.env.NEXT_PUBLIC_PUMP_ADD ? (
            <>
              {Array(5)
                .fill(null)
                .map((_, i) => (
                  <React.Fragment key={`first-extended-${i}`}>
                    <span className="mx-4 text-[#5D3014] font-bold">
                      it ain't gay, it ain't racist, it's finance fellas
                    </span>
                    <img
                      src="/assets/mcd-bottom-bar-icon.svg"
                      alt="mcd"
                      className="w-6 h-6 inline-block"
                    />
                    <span className="mx-4 text-[#5D3014] font-bold">$BEGS</span>
                    <img
                      src="/assets/mcd-bottom-bar-icon.svg"
                      alt="mcd"
                      className="w-6 h-6 inline-block"
                    />
                    <span className="mx-4 text-[#5D3014] font-bold">
                      ca: {process.env.NEXT_PUBLIC_PUMP_ADD}
                    </span>
                    <img
                      src="/assets/mcd-bottom-bar-icon.svg"
                      alt="mcd"
                      className="w-6 h-6 inline-block"
                    />
                  </React.Fragment>
                ))}
            </>
          ) : (
            <>
              {Array(10)
                .fill("it ain't gay, it ain't racist, it's finance fellas")
                .map((text, i) => (
                  <React.Fragment key={`first-${i}`}>
                    <span className="mx-4 text-[#5D3014] font-bold">
                      {text}
                    </span>
                    <img
                      src="/assets/mcd-bottom-bar-icon.svg"
                      alt="mcd"
                      className="w-6 h-6 inline-block"
                    />
                  </React.Fragment>
                ))}
            </>
          )}
          {/* Duplicate set for seamless loop */}
          {process.env.NEXT_PUBLIC_PUMP_ADD ? (
            <>
              {Array(5)
                .fill(null)
                .map((_, i) => (
                  <React.Fragment key={`second-extended-${i}`}>
                    <span className="mx-4 text-[#5D3014] font-bold">
                      it ain't gay, it ain't racist, it's finance fellas
                    </span>
                    <img
                      src="/assets/mcd-bottom-bar-icon.svg"
                      alt="mcd"
                      className="w-6 h-6 inline-block"
                    />
                    <span className="mx-4 text-[#5D3014] font-bold">$BEGS</span>
                    <img
                      src="/assets/mcd-bottom-bar-icon.svg"
                      alt="mcd"
                      className="w-6 h-6 inline-block"
                    />
                    <span className="mx-4 text-[#5D3014] font-bold">
                      ca: {process.env.NEXT_PUBLIC_PUMP_ADD}
                    </span>
                    <img
                      src="/assets/mcd-bottom-bar-icon.svg"
                      alt="mcd"
                      className="w-6 h-6 inline-block"
                    />
                  </React.Fragment>
                ))}
            </>
          ) : (
            <>
              {Array(10)
                .fill("it ain't gay, it ain't racist, it's finance fellas")
                .map((text, i) => (
                  <React.Fragment key={`second-${i}`}>
                    <span className="mx-4 text-[#5D3014] font-bold">
                      {text}
                    </span>
                    <img
                      src="/assets/mcd-bottom-bar-icon.svg"
                      alt="mcd"
                      className="w-6 h-6 inline-block"
                    />
                  </React.Fragment>
                ))}
            </>
          )}
        </div>
      </div>
      <DonateModal
        isOpen={donateModal.isOpen}
        onClose={() => setDonateModal((prev) => ({ ...prev, isOpen: false }))}
        solAmount={donateModal.solAmount}
        fillAmount={donateModal.fillAmount}
        onDonate={handleDonateSubmit}
        isDonating={!!donatingMessageId}
      />
    </>
  );
}

const CopyIcon = ({
  color,
  width = "12",
  height = "12",
  className,
}: {
  color: string;
  width?: string;
  height?: string;
  className?: string;
}) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M6.375 3.9375C6.375 3.29103 6.63181 2.67105 7.08893 2.21393C7.54605 1.75681 8.16603 1.5 8.8125 1.5H17.8125C18.459 1.5 19.079 1.75681 19.5361 2.21393C19.9932 2.67105 20.25 3.29103 20.25 3.9375V17.4375C20.25 17.7576 20.187 18.0746 20.0645 18.3703C19.942 18.666 19.7624 18.9347 19.5361 19.1611C19.3097 19.3874 19.041 19.567 18.7453 19.6895C18.4496 19.812 18.1326 19.875 17.8125 19.875H8.8125C8.4924 19.875 8.17544 19.812 7.87971 19.6895C7.58398 19.567 7.31527 19.3874 7.08893 19.1611C6.86258 18.9347 6.68304 18.666 6.56054 18.3703C6.43805 18.0746 6.375 17.7576 6.375 17.4375V3.9375ZM3.75 6.5625C3.75 5.5485 4.3695 4.67925 5.25 4.31175V17.6243C5.25 18.5194 5.60558 19.3778 6.23851 20.0107C6.87145 20.6437 7.72989 20.9993 8.625 20.9993H17.4382C17.2531 21.4436 16.9406 21.8231 16.54 22.0901C16.1395 22.357 15.6689 22.4994 15.1875 22.4993H8.625C7.3322 22.4993 6.09234 21.9857 5.17812 21.0717C4.2639 20.1576 3.7502 18.9178 3.75 17.625V6.5625Z"
        fill={color}
      />
    </svg>
  );
};

const RoadMapInfo = () => (
  <>
    <div className="flex items-center justify-between w-full h-[60px] relative">
      <img
        src="/assets/roadmape-icon.svg"
        alt="roadmape"
        className="absolute left-[-40px] top-[40%] translate-y-[-50%]"
      />
      <img
        src="https://media.tenor.com/0iHLh37L15EAAAAj/lfg-wsb.gif"
        width={105}
        height={89}
        className="absolute right-[0px] top-[-24px]"
      />
    </div>
    <div>
      <p className="text-[20px] text-[#5D3014] font-bold mb-2">
        500K - Rewards
      </p>
      <p className="text-[16px] text-black">
        Top beggars/donors are dropped $BEGS
      </p>
    </div>
    <hr className="w-full h-0 border-[0.5px] border-[#5D3014] opacity-100" />
    <div>
      <p className="text-[20px] text-[#5D3014] font-bold mb-2">
        1M- Image/Video
      </p>
      <p className="text-[16px] text-black">Upload content and beg</p>
    </div>
    <hr className="w-full h-0 border-[0.5px] border-[#5D3014] opacity-100" />
    <div>
      <p className="text-[20px] text-[#5D3014] font-bold mb-2">
        5M- Leaderboard
      </p>
      <p className="text-[16px] text-black">Beggar/donor of the day</p>
    </div>
    <hr className="w-full h-0 border-[0.5px] border-[#5D3014] opacity-100" />
    <div>
      <p className="text-[20px] text-[#5D3014] font-bold mb-2">10M- BegPad</p>
      <p className="text-[16px] text-black">Official launchpad to beg</p>
    </div>
    <hr className="w-full h-0 border-[0.5px] border-[#5D3014] opacity-100" />
    <div>
      <p className="text-[20px] text-[#5D3014] font-bold mb-2">
        20M- Livestream
      </p>
      <p className="text-[16px] text-black">Beggars can livestream</p>
    </div>
  </>
);

const ConnectButton = ({ isMobile = false }) => (
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
        } text-[#FFD44F] font-bold`}
      >
        Connect Wallet
      </span>
    </WalletMultiButton>
  </>
);

const ConnectedState = ({
  address,
  disconnect,
  isMobile = false,
}: {
  address: string;
  disconnect: () => Promise<void>;
  isMobile?: boolean;
}) => (
  <>
    <div
      className={`rounded-[8px] h-full ${
        isMobile ? "px-2 py-[2px]" : "px-4 py-1"
      } border border-black flex items-center gap-2 bg-[#FFD44F] shadow-[inset_0px_4px_8px_0px_rgba(0,0,0,0.25)]`}
    >
      <img
        src="/assets/solana-brown-icon.svg"
        alt="solana"
        className={isMobile ? "w-3 h-3" : "w-6 h-6"}
      />
      <p
        className={`text-[#5D3014] ${isMobile ? "text-[9px]" : "text-[16px]"}`}
      >
        {address.slice(0, 4)}...
        {address.slice(-4)}
      </p>
    </div>
    <div
      className={`rounded-[8px] h-full ${
        isMobile ? "w-6" : "w-10"
      } cursor-pointer flex items-center justify-center bg-[#FF9933]`}
      onClick={disconnect}
    >
      <img
        src="/assets/disconnect-icon.svg"
        alt="disconnect"
        className={isMobile ? "w-[14px] h-[14px]" : "w-6 h-6"}
      />
    </div>
  </>
);

const SocialLinks = ({ isMobile = false }) => (
  <>
    <div
      className={`${
        isMobile
          ? "w-full lg:hidden flex pt-3 justify-center"
          : "lg:flex hidden justify-end"
      } items-center gap-2`}
    >
      {process.env.NEXT_PUBLIC_PUMP_ADD ? (
        <>
          <Link
            href={`https://pump.fun/coin/${process.env.NEXT_PUBLIC_PUMP_ADD}`}
            target="_blank"
            rel="noreferrer noopener nofollower"
          >
            <img
              src="/assets/pump-icon.svg"
              alt="pump"
              className={isMobile ? "w-6 h-6" : "w-10 h-10"}
              style={{
                filter: "drop-shadow(0px 4px 8px rgba(93, 48, 20, 0.4))",
              }}
            />
          </Link>
        </>
      ) : null}
      {process.env.NEXT_PUBLIC_DEXTOOLS ? (
        <>
          <Link
            href={process.env.NEXT_PUBLIC_DEXTOOLS}
            target="_blank"
            rel="noreferrer noopener nofollower"
          >
            <img
              src="/assets/dexscreener-icon.svg"
              alt="dexscreener"
              className={isMobile ? "w-6 h-6" : "w-10 h-10"}
              style={{
                filter: "drop-shadow(0px 4px 8px rgba(93, 48, 20, 0.4))",
              }}
            />
          </Link>
        </>
      ) : null}
      <Link
        href={`https://x.com/begsfun`}
        target="_blank"
        rel="noreferrer noopener nofollower"
      >
        <img
          src="/assets/x-icon.svg"
          alt="x"
          className={isMobile ? "w-6 h-6" : "w-10 h-10"}
          style={{
            filter: "drop-shadow(0px 4px 8px rgba(93, 48, 20, 0.4))",
          }}
        />
      </Link>
    </div>
  </>
);

const DonateButton = ({
  handleDonateClick,
  donatingMessageId,
  msg,
  isMobile = false,
}: {
  handleDonateClick: (
    recipientAddress: string,
    amount: string,
    messageId: string,
    fillAmount: string
  ) => void;
  donatingMessageId: string | null;
  msg: {
    _id: string;
    solAmount: string;
    walletAddress: string;
    fillAmount: string;
  };
  isMobile?: boolean;
}) => (
  <>
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
      className={`${
        isMobile ? "flex lg:hidden w-full" : "hidden lg:flex w-fit"
      } bg-black cursor-pointer py-[2px] px-2 rounded-[8px] items-center justify-center gap-2 disabled:opacity-70`}
      style={{
        filter: "drop-shadow(0px 4px 8px rgba(93, 48, 20, 0.4))",
      }}
    >
      {donatingMessageId === msg._id ? (
        <div className="w-5 h-5 border-2 border-[#FFD44F] border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          <span className="text-[16px]">🫳</span>
          <span className="font-bold text-[#FFD44F] text-[14px]">Donate</span>
        </>
      )}
    </button>
  </>
);

const AudioOptions = ({
  musicEnabled,
  handleMusicChange,
  isMobile,
}: {
  musicEnabled: boolean;
  handleMusicChange: (checked: boolean) => void;
  isMobile?: boolean;
}) => (
  <div
    className={`flex items-start justify-center gap-4 w-full p-3 border border-[#5D3014] rounded-[8px] ${
      isMobile ? "mb-4" : ""
    }`}
  >
    <div className="flex items-center justify-center gap-2">
      <Switch
        size="small"
        checked={musicEnabled}
        onCheckedChange={handleMusicChange}
      />
      <span className="text-black">Music</span>
    </div>
  </div>
);
