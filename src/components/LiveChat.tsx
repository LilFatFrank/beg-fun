"use client";
import { useState, useEffect, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

type LiveMessage = {
  walletAddress: string;
  message: string;
  _id: string;
  timestamp: string;
};

const colors = ["#FF3D20", "#454CFF", "#089420", "#3E006F", "#000000"];

const LiveChat = () => {
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { publicKey, connected } = useWallet();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const websocketRetries = useRef(0);
  
  // Admin wallet addresses
  const adminWallets = process.env.NEXT_PUBLIC_ADMIN_WALLETS
    ? process.env.NEXT_PUBLIC_ADMIN_WALLETS.split(",")
    : [];
  
  // Check if current wallet is admin
  const isAdmin = publicKey && adminWallets.includes(publicKey.toBase58());

  // Fetch initial messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          `https://7dfinzalu3.execute-api.ap-south-1.amazonaws.com/dev/?method=get_beg_live_messages&limit=100`
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        // Check multiple possible locations for the messages array in the response
        const messagesArray = data.messages || data.data || [];
        setMessages(messagesArray);
      } catch (error) {
        console.error("Error fetching live messages:", error);
        toast.error("Could not load chat messages");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
  }, []);

  // Set up WebSocket connection
  useEffect(() => {
    const setupWebSocket = () => {
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
        console.log("WebSocket connection established for live chat");
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
            receivedMessage.type === "begLiveMessage" ||
            receivedMessage.type === "begLiveMessageConfirmation"
          ) {
            // Add new message to the state
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
                  message: receivedMessage.message,
                  _id: receivedMessage.message_id,
                  timestamp: receivedMessage.timestamp,
                },
              ];
            });

            // Scroll to bottom after adding a new message
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 100);
          } else if (
            receivedMessage.type === "begLiveMessageDeleted" ||
            receivedMessage.type === "begLiveMessageDeletedConfirmation"
          ) {
            // Remove deleted message
            setMessages((prevMessages) =>
              prevMessages.filter(
                (message) => message._id !== receivedMessage.message_id
              )
            );

            if (receivedMessage.type === "begLiveMessageDeletedConfirmation") {
              toast.success("Message deleted!");
            }
          }
        } catch (error) {
          console.error("Error parsing message:", error);
        }
      };

      websocketRef.current.onclose = () => {
        console.log("WebSocket connection closed for live chat");
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        setTimeout(() => {
          console.log("Reconnecting WebSocket for live chat...");
          setupWebSocket();
        }, Math.min(1000 * Math.pow(2, websocketRetries.current++), 30000));
      };

      websocketRef.current.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
    };

    setupWebSocket();

    return () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }

      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    // Scroll to bottom immediately when messages are first loaded
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
    // Also use messagesEndRef for smooth scrolling when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Get consistent color based on wallet address
  const getColorForAddress = (address: string) => {
    // Use the last character of the address as a simple hash
    const charCode = address.charCodeAt(address.length - 1);
    return colors[charCode % colors.length];
  };

  const handleSendMessage = () => {
    if (!messageText.trim()) {
      toast.error("Please enter a message");
      return;
    }

    if (messageText.length < 4) {
      toast.error("Message must be at least 4 characters");
      return;
    }

    if (!publicKey) {
      toast.error("Please connect your wallet to chat");
      return;
    }

    if (websocketRef.current?.readyState !== WebSocket.OPEN) {
      toast.error("Connection error. Please try again.");
      return;
    }

    const messageData = {
      action: "sendBegLiveMessage",
      walletAddress: publicKey.toBase58(),
      message: messageText,
    };

    websocketRef.current.send(JSON.stringify(messageData));
    setMessageText("");
  };

  const handleDeleteMessage = (messageId: string) => {
    if (!publicKey) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!isAdmin) {
      toast.error("Only admins can delete messages");
      return;
    }

    if (websocketRef.current?.readyState !== WebSocket.OPEN) {
      toast.error("Connection error. Please try again.");
      return;
    }

    const deleteData = {
      action: "deleteBegLiveMessage",
      walletAddress: publicKey.toBase58(),
      messageId: messageId,
    };

    websocketRef.current.send(JSON.stringify(deleteData));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    // Limit input to 100 characters
    if (text.length <= 100) {
      setMessageText(text);
    }
  };

  return (
    <div className="grow w-full bg-[#FFD44F] rounded-[8px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] flex flex-col">
      <div className="py-2 px-3 flex items-center justify-between relative">
        <div className="flex items-center gap-2">
          <img src="/assets/mfer-icon.svg" alt="mfer" className="w-10 h-10" />
          <p className="text-[18px] text-[#121212] font-bold">beg chat</p>
        </div>
        <img
          src="/assets/ws-pump.gif"
          alt="pump"
          className="absolute right-0 bottom-[4px] w-20 h-20"
        />
      </div>
      <hr
        className="w-full h-0 border-[0.5px] opacity-100"
        style={{ borderColor: "rgba(93, 48, 20, 0.34)" }}
      />
      <div className="grow w-full h-full py-2 px-3 flex flex-col items-center justify-between gap-2">
        <div
          ref={chatContainerRef}
          className="grow w-full overflow-y-auto flex flex-col"
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
          }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-3 border-[#5D3014] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center py-10">
              <p className="text-[#5D3014] text-sm">No messages yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {messages.map((msg, i, arr) => (
                <div
                  key={msg._id}
                  className="w-full flex flex-col items-start justify-start gap-1"
                >
                  <p
                    className="font-bold text-[14px]"
                    style={{ color: getColorForAddress(msg.walletAddress) }}
                  >
                    {msg.walletAddress.slice(0, 4)}...
                    {msg.walletAddress.slice(-4)}
                    {isAdmin && (
                      <img
                        src="/assets/delete-chat-icon.svg"
                        alt="delete"
                        className="w-4 h-4 cursor-pointer inline-block ml-2 relative bottom-[2px]"
                        onClick={() => handleDeleteMessage(msg._id)}
                      />
                    )}
                  </p>
                  <p className="font-normal text-[14px]">{msg.message}</p>
                  {i !== arr.length - 1 ? (
                    <hr
                      className="w-full h-0 border-[0.5px] opacity-100"
                      style={{ borderColor: "rgba(93, 48, 20, 0.34)" }}
                    />
                  ) : null}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        {connected ? (
          <div className="flex-shrink-0 h-[40px] w-full p-1 rounded-[4px] border border-[#5D3014] bg-white flex items-center gap-2">
            <input
              className="grow outline-none border-none p-0 placeholder:text-[#8F95B2] text-[14px]"
              placeholder="discuss"
              value={messageText}
              onChange={handleMessageChange}
              onKeyDown={handleKeyPress}
              maxLength={100}
            />
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#8F95B2]">
                {messageText.length}/100
              </span>
              <img
                src="/assets/send-live-msg-icon.svg"
                alt="send"
                className="w-8 h-8 cursor-pointer"
                onClick={handleSendMessage}
              />
            </div>
          </div>
        ) : (
          <WalletMultiButton
            style={{
              background: "black",
              cursor: "pointer",
              padding: "4px 16px",
              width: "100%",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              color: "#FFD44F",
              fontWeight: 800,
              height: "40px",
            }}
          >
            <img
              src="/assets/solana-yellow-icon.svg"
              alt="solana"
              className={"w-6 h-6"}
            />
            <span
              className={`font-[ComicSans] text-[16px] text-[#FFD44F] font-bold`}
            >
              Connect to chat
            </span>
          </WalletMultiButton>
        )}
      </div>
    </div>
  );
};

export default LiveChat;
