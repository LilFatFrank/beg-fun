import { PublicKey } from "@solana/web3.js";
import { format, isToday, parseISO } from "date-fns";
import { toast } from "sonner";

export const formatMessageTime = (timestamp: string) => {
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
    return format(localDate, "do MMM"); // Formats like "15th Jan"
  } catch (error) {
    console.error("Error formatting date:", error);
    return timestamp; // Return original timestamp if parsing fails
  }
};

// Utility function to format SOL amounts
export const formatSolAmount = (amount: string | number): string => {
  const num = Number(amount);

  // Check if the number has decimal places
  if (num % 1 === 0) {
    // If it's a whole number, display without decimals
    return num.toString();
  } else {
    // Convert to string and remove trailing zeros
    return Number(num.toFixed(4)).toString();
  }
};

// Add validation function for SOL amounts
export const validateSolAmount = (value: string): string => {
  // Remove any non-numeric characters except decimal point
  const cleanValue = value.replace(/[^\d.]/g, "");

  // If empty, return empty string
  if (!cleanValue) return "";

  // Convert to number
  const num = parseFloat(cleanValue);

  // Check if it's a valid number
  if (isNaN(num)) return "";

  // Check if it exceeds 100 SOL
  if (num > 100) return "100";

  // If the input contains a decimal point
  if (value.includes(".")) {
    // Split into whole and decimal parts
    const [whole, decimal] = value.split(".");
    // If decimal part is longer than 2 digits, limit it
    if (decimal && decimal.length > 2) {
      return Number(num.toFixed(2)).toString();
    }
    // Otherwise return the original input
    return value;
  }

  // If no decimal point, return as is
  return value;
};

// Add the Jupiter Terminal utility function
export const openJupiterTerminal = (type: "modal" | "integrated" = "modal") => {
  if (typeof window !== "undefined" && window.Jupiter) {
    const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC!; // You can replace with a better RPC provider

    window.Jupiter.init({
      displayMode: type,
      endpoint: RPC_ENDPOINT,
      ...(type === "integrated"
        ? { integratedTargetId: "integrated-terminal" }
        : {}),
      formProps: {
        initialInputMint: "So11111111111111111111111111111111111111112",
        initialOutputMint: process.env.NEXT_PUBLIC_PUMP_ADD,
        fixedInputMint: true,
        fixedOutputMint: true,
      },
      containerClassName:
        "max-h-[90vh] lg:max-h-[600px] w-full lg:w-[600px] overflow-hidden",
      containerStyles: {
        zIndex: 999999,
      },
    });
  } else {
    console.error("Jupiter Terminal is not loaded");
    toast.error("Error loading Jupiter Terminal");
  }
};

export const detectSolanaAddress = (add: string) => {
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

export const solAmounts = ["0.1", "0.5", "1", "5", "10", "100"];

export const voiceTypes = ["Indian", "Nigerian", "Chinese"];

export const voiceIds = {
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

export const reactions = [
  {
    val: "floor_rolling_laugh",
    icon: "/assets/laughing-emoji-icon.svg",
    color: "#F8D75A",
    audio: "/assets/laugh-reaction.mp3",
  },
  {
    val: "fire",
    icon: "/assets/fire-emoji-icon.svg",
    color: "#4EAB5E",
    audio: "/assets/fire-reaction.mp3",
  },
  {
    val: "crying_face",
    icon: "/assets/crying-emoji-icon.svg",
    color: "#A7AAF2",
    audio: "/assets/cry-reaction.mp3",
  },
  {
    val: "angry_sad_unhappy",
    icon: "/assets/angry-emoji-icon.svg",
    color: "#F27360",
    audio: "/assets/angry-reaction.mp3",
  },
  {
    val: "poop",
    icon: "/assets/poop-emoji-icon.svg",
    color: "#EFB03D",
    audio: "/assets/poop-reaction.mp3",
  },
  {
    val: "clown",
    icon: "/assets/clown-emoji-icon.svg",
    color: "#F2A7B0",
    audio: "/assets/clown-reaction.mp3",
  },
];

export const getRandomVoiceType = () => {
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

export const getRandomVoiceId = (voiceType: string) => {
  const availableVoices = voiceIds[voiceType as keyof typeof voiceIds];
  if (Array.isArray(availableVoices)) {
    const randomIndex = Math.floor(Math.random() * availableVoices.length);
    return availableVoices[randomIndex];
  }
  return availableVoices; // For Chinese which is a single string
};

export const getFlagIcon = (voiceType: string) => {
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

// Check if a URL is a video based on its extension
export const isVideoUrl = (url: string): boolean => {
  return /\.(mp4|webm|mov|qt|avi)$/i.test(url);
};

// Check if file is a video based on type
export const isVideoFile = (file: File | null) => {
  if (!file) return false;
  return file.type.startsWith("video/");
};

export const MIN_WORDS = 6;
export const MAX_WORDS = 200;
export const COOLDOWN_DURATION = 60;

export const getWordCount = (text: string) => {
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
};
