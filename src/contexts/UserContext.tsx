"use client";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWebSocket } from "./WebSocketContext";
import { toast } from "sonner";

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

interface UserContextType {
  userData: UserData | null;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType>({
  userData: null,
  isLoading: false,
});

export const useUser = () => useContext(UserContext);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { publicKey, connected } = useWallet();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { websocket, sendMessage, onMessage } = useWebSocket();

  // Handle wallet connection/disconnection
  useEffect(() => {
    if (connected && publicKey && websocket) {
      // Check if user exists via API when wallet connects
      checkUserExists(publicKey.toString());
    } else {
      // Clear user data when wallet disconnects
      setUserData(null);
    }
  }, [websocket, connected, publicKey]);

  // Function to check if user exists via API
  const checkUserExists = useCallback(
    async (walletAddress: string) => {
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        setIsLoading(true);

        try {
          const response = await fetch(
            `https://7dfinzalu3.execute-api.ap-south-1.amazonaws.com/dev/?method=get_beg_user&walletAddress=${walletAddress}`
          );
          const data = await response.json();
          if (data.message === "User retrieved successfully") {
            // User exists, set user data
            setUserData(data.data);
          } else if (data.message === "User not found") {
            // User doesn't exist, register via WebSocket
            if (websocket) {
              sendMessage({
                action: "createBegUser",
                walletAddress: walletAddress,
              });
            } else {
              console.log(
                "WebSocket connection not available for registration"
              );
            }
          } else {
            console.log(data.message || "Failed to check user existence");
          }
        } catch (err) {
          console.error("Error checking user:", err);
          toast.error("Error checking user");
          console.log("Failed to check user existence");
        } finally {
          setIsLoading(false);
        }
      }
    },
    [websocket]
  );

  // Handle WebSocket messages for user data
  useEffect(() => {
    const cleanup = onMessage((event) => {
      try {
        const receivedMessage = JSON.parse(event.data);
        if (
          receivedMessage.type === "userCreated" ||
          receivedMessage.type === "userCreatedConfirmation"
        ) {
          setUserData(receivedMessage.user);
        }
      } catch (error) {
        toast.error("Error parsing message");
        console.error("Error parsing message:", error);
      }
    });

    return () => {
      cleanup();
    };
  }, [onMessage]);

  return (
    <UserContext.Provider value={{ userData, isLoading }}>
      {children}
    </UserContext.Provider>
  );
};
