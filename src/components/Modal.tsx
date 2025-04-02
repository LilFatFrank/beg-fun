"use client";
import { CSSProperties, useEffect } from "react";

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
        onClick={(e) => {e.stopPropagation(); e.preventDefault();}}
      >
        {children}
      </div>
    </div>
  );
};

export default Modal;
