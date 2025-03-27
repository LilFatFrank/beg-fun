"use client";
import { useEffect, useRef, useState } from "react";

const MessageText = ({
  text,
  setIsExpanded,
  lines = 4,
}: {
  text: string;
  setIsExpanded: (val: boolean) => void;
  lines?: number;
}) => {
  const [hasOverflow, setHasOverflow] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = textRef.current;
    const measureElement = measureRef.current;
    if (element && measureElement) {
      // First measure without line-clamp to see if it would overflow
      const lineHeight = parseInt(
        window.getComputedStyle(measureElement).lineHeight
      );
      const wouldOverflow = measureElement.scrollHeight > lineHeight * lines;
      setHasOverflow(wouldOverflow);
    }
  }, [text]);

  return (
    <>
      <div className="relative w-full">
        {/* Hidden element to measure overflow */}
        <div
          ref={measureRef}
          className="text-black text-[12px] sm:text-[14px] break-all absolute opacity-0 pointer-events-none"
          style={{ width: "100%" }}
        >
          {text}
        </div>
        {/* Visible element with truncation */}
        <div
          ref={textRef}
          className={`text-[12px] sm:text-[14px] break-all line-clamp-4 text-black`}
        >
          {text}
          {hasOverflow && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setIsExpanded(true);
              }}
              className="absolute bottom-0 font-bold cursor-pointer right-0 bg-white pl-1 text-[12px] sm:text-[14px] text-[#5D3014] hover:underline"
            >
              ...view more
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default MessageText;
