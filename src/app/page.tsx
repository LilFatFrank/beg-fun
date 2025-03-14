"use client";
import { PublicKey } from "@solana/web3.js";
import { motion } from "framer-motion";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";

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

export default function Home() {
  const [messages, setMessages] = useState<
    { walletAddress: string; text: string; solAmount: string; _id: string }[]
  >([]);
  const [walletAddress, setWalletAddress] = useState("");
  const [messageText, setMessageText] = useState("");
  const [solAmount, setSolAmount] = useState("");
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [lastActive, setLastActive] = useState<number>(Date.now());
  const websocketRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const websocketRetries = useRef(0);
  const idleCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Function to fetch initial messages
  const fetchInitialMessages = useCallback(async () => {
    try {
      const response = await fetch(
        `https://7dfinzalu3.execute-api.ap-south-1.amazonaws.com/dev/?method=get_beg_messages`
      );
      const data = await response.json();
      // Reverse the messages array since API returns latest first
      setMessages(
        data.messages
          .map((d: any) => ({
            walletAddress: d.walletAddress,
            text: d.text,
            solAmount: d.solAmount,
            _id: d._id,
          }))
          .reverse()
      );
      console.log("Messages refreshed");
    } catch (error) {
      console.error("Error fetching initial messages:", error);
    }
  }, []);

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
        console.log(receivedMessage);

        // Only add to messages if it's a chat message (not a ping response)
        if (receivedMessage.walletAddress && receivedMessage.text) {
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              walletAddress: receivedMessage.walletAddress,
              text: receivedMessage.text,
              solAmount: receivedMessage.solAmount,
              _id: receivedMessage.message_id,
            },
          ]);
          setMessageText("");
          setWalletAddress("");
          setSolAmount("");
        }
      } catch (error) {
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
      if (
        !walletAddress.trim() ||
        !messageText.trim() ||
        websocketRef.current?.readyState !== WebSocket.OPEN
      ) {
        return;
      }

      const messageData = {
        action: "sendBegMessage",
        walletAddress: walletAddress,
        text: messageText,
        solAmount: solAmount,
      };

      websocketRef.current.send(JSON.stringify(messageData));
    } catch (error) {
      console.log(error);
    }
  }, [walletAddress, messageText, solAmount]);

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
  }, [fetchInitialMessages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const begDisabled = useMemo(
    () =>
      !messageText ||
      !solAmount ||
      (walletAddress && !detectSolanaAddress(walletAddress)) ||
      !walletAddress,
    [messageText, solAmount, walletAddress]
  );

  return (
    <div className="container mx-auto flex flex-col h-screen max-h-screen py-[40px] sm:py-[60px] md:py-[80px] lg:py-[100px] max-md:px-[20px] relative">
      <img src="/assets/roadmap-image.jpg" alt="roadmap" className="absolute left-0 hidden lg:block lg:top-[100px]" />
      <div className="flex flex-col items-center justify-center">
        <img
          src="/assets/logo-icon.svg"
          alt="logo"
          className="w-[80px] h-[80px] sm:w-[100px] sm:h-[100px] md:w-[120px] md:h-[120px]"
        />
        <p className="text-[32px] sm:text-[44px] md:text-[56px] leading-tight">
          beg.fun
        </p>
        <p className="text-[16px] sm:text-[20px] md:text-[24px] mt-2 md:mt-4">
          please send me 1 sol bro
        </p>
      </div>

      {/* Messages container - fixed order to show newest at bottom */}
      <div className="grow flex-1 flex flex-col-reverse overflow-y-auto p-4">
        <div className="flex-1 flex flex-col justify-end">
          {messages.map((msg, index) => (
            <div
              key={index}
              className="mb-4 p-3 sm:p-4 w-full flex items-start justify-start gap-2 md:max-w-[540px] mx-auto border border-[#FFD44F] rounded-[8px] bg-white"
            >
              <img
                src="/assets/india-flag-icon.svg"
                alt="india"
                className="w-5 h-5 sm:w-6 sm:h-6"
              />
              <div className="grow flex flex-col gap-2 sm:gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 sm:gap-2 text-[#5D3014]">
                    <span className="font-[Montserrat] font-medium text-[12px] sm:text-[14px] text-inherit">
                      {msg.walletAddress.slice(0, 4)}...
                      {msg.walletAddress.slice(-4)}
                    </span>
                    <span>
                      <motion.button
                        onClick={() => copyText(msg.walletAddress, msg._id)}
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
                            <CopyIcon color={"#5D3014"} width="10" height="10" className="sm:w-[12px] sm:h-[12px]" />
                          </div>
                        )}
                      </motion.button>
                    </span>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <img
                      src="/assets/solana-black-icon.svg"
                      alt="sol"
                      className="w-5 h-5 sm:w-6 sm:h-6"
                    />
                    <p className="font-[Montserrat] font-medium text-[12px] sm:text-[14px]">{msg.solAmount} SOL</p>
                  </div>
                </div>
                <div className="text-[12px] sm:text-[14px] break-all overflow-y-auto max-h-[72px] sm:max-h-[92px]">
                  {msg.text}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="py-3 px-4 sm:py-4 sm:px-6 rounded-[8px] bg-[#FFD44F] w-full md:max-w-[540px] mx-auto">
        <div className="flex flex-col space-y-2">
          <textarea
            placeholder="enter your beg request"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleKeyPress}
            className="p-2 rounded-[8px] bg-white resize-none text-[14px] sm:text-[16px] outline-none border-none"
            rows={2}
          />
          <div className="max-md:flex-col flex items-center gap-2">
            <div className="w-full rounded-[8px] bg-white p-2 flex items-center gap-2">
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
                className="outline-none border-none text-[14px] sm:text-[16px] pr-2 remove-arrow"
              />
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
                onChange={(e) => setWalletAddress(e.target.value)}
                className="outline-none border-none text-[14px] sm:text-[16px] pr-2"
              />
            </div>
          </div>
          <button
            onClick={handleSendMessage}
            disabled={begDisabled}
            className="h-[36px] sm:h-[40px] flex items-center justify-center cursor-pointer gap-2 bg-black text-[#FFD44F] text-[14px] sm:text-[16px] rounded-[8px] outline-none border-none disabled:opacity-[0.6] disabled:cursor-not-allowed"
          >
            <img src="/assets/bolt-icon.svg" alt="bolt" className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>BEG</span>
          </button>
        </div>
      </div>
    </div>
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
