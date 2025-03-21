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
    // If it has decimals, use toFixed(4) to limit decimal places
    return num.toFixed(4);
  }
};