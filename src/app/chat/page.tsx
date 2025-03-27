"use client";
import BackToBegs from "@/components/BackToBegs";
import LiveChat from "@/components/LiveChat";

const Chat = () => {
  return (
    <div className="lg:hidden block h-[95%]">
      <BackToBegs />
      <LiveChat />
    </div>
  );
};

export default Chat;
