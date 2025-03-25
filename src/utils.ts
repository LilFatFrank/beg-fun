import { format, isToday, parseISO } from "date-fns";

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
