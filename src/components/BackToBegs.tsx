"use client";

import Link from "next/link";

const BackToBegs = () => {
  return (
    <Link href={"/"} className="w-auto">
      <button className="cursor-pointer flex items-center justify-center gap-2 py-2 px-4 rounded-full border border-[#5D3014]">
        <img src="/assets/back-btn-icon.svg" alt="back" className="w-4 h-4" />
        <p className="text-[14px] font-bold">Back to begs</p>
      </button>
    </Link>
  );
};

export default BackToBegs;
