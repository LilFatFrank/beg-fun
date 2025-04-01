"use client";
import React, { createContext, useContext, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';

interface WebSocketContextType {
  sendMessage: (message: any) => void;
  isConnected: boolean;
  websocket: WebSocket | null;
  onMessage: (callback: (event: MessageEvent) => void) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const websocketRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const websocketRetries = useRef(0);
  const [isConnected, setIsConnected] = React.useState(false);
  const messageHandlers = useRef<((event: MessageEvent) => void)[]>([]);

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
      websocketRetries.current = 0;
      setIsConnected(true);
      pingIntervalRef.current = setInterval(() => {
        if (websocketRef.current?.readyState === WebSocket.OPEN) {
          websocketRef.current.send(JSON.stringify({ type: "ping" }));
        }
      }, 30000);
    };

    websocketRef.current.onmessage = (event) => {
      messageHandlers.current.forEach(handler => handler(event));
      
      try {
        const receivedMessage = JSON.parse(event.data);
        
        // Handle different message types
        switch (receivedMessage.type) {
          case "begMessage":
          case "begMessageConfirmation":
            window.dispatchEvent(new CustomEvent('begMessage', { detail: receivedMessage }));
            break;
          case "begMessageUpdate":
          case "begMessageUpdateConfirmation":
            window.dispatchEvent(new CustomEvent('begMessageUpdate', { detail: receivedMessage }));
            break;
          case "begMessageDeleted":
          case "begMessageDeletedConfirmation":
            window.dispatchEvent(new CustomEvent('begMessageDeleted', { detail: receivedMessage }));
            break;
          case "begMessageReaction":
          case "begMessageReactionConfirmation":
            window.dispatchEvent(new CustomEvent('begMessageReaction', { detail: receivedMessage }));
            break;
          case "begComment":
          case "begCommentConfirmation":
            window.dispatchEvent(new CustomEvent('begComment', { detail: receivedMessage }));
            break;
          case "begCommentDeleted":
          case "begCommentDeletedConfirmation":
            window.dispatchEvent(new CustomEvent('begCommentDeleted', { detail: receivedMessage }));
            break;
        }
      } catch (error) {
        console.error("Error parsing message:", error);
        toast.error("Error parsing message");
      }
    };

    websocketRef.current.onclose = () => {
      console.log("WebSocket connection closed");
      setIsConnected(false);
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
      setIsConnected(false);
    };
  }, []);

  useEffect(() => {
    setupWebSocket();

    return () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
  }, [setupWebSocket]);

  const sendMessage = useCallback((message: any) => {
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify(message));
    } else {
      toast.error("Connection error. Please try again.");
    }
  }, []);

  const onMessage = useCallback((callback: (event: MessageEvent) => void) => {
    messageHandlers.current.push(callback);
    return () => {
      messageHandlers.current = messageHandlers.current.filter(h => h !== callback);
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ sendMessage, isConnected, websocket: websocketRef.current, onMessage }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}