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
      return format(localDate, "do MMM ''yy"); // Formats like "15th Jan '25"
    } catch (error) {
      console.error("Error formatting date:", error);
      return timestamp; // Return original timestamp if parsing fails
    }
  };