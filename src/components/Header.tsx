"use client";

import { useState } from "react";
import Modal from "./Modal";
import { openJupiterTerminal } from "@/utils";
import { ConnectButton, ConnectedState } from "./ConnectComponents";
import { useWallet } from "@solana/wallet-adapter-react";
import RoadMapInfo from "./RoadmapInfo";
import { motion, AnimatePresence } from "framer-motion";
import AudioOptions from "./AudioOptions";
import Link from "next/link";

const AppHeader = () => {
  const { connected } = useWallet();
  const [openRoadmapModal, setOpenRoadmapModal] = useState(false);
  const [openMenuIcon, setOpenMenuIcon] = useState(false);

  return (
    <>
      <div className="lg:flex w-full bg-white p-2 items-center h-auto justify-between rounded-[16px] border border-[#8F95B2] hidden">
        <div className="flex-shrink-0 flex items-center gap-4 justify-end">
          <img
            src="/assets/logo-icon-fav.svg"
            alt="logo"
            className="w-16 h-16 rounded-[8px]"
          />
          <p className="flex items-center gap-2 text-[#5D3014] text-[32px]">
            BegsFun
            <span className="text-[#5D3014] text-[16px]">
              (please send me 1 sol bro)
            </span>
          </p>
        </div>
        <div className="flex-shrink-0 flex items-center gap-4">
          <span className="text-[#5D3014] font-bold cursor-not-allowed opacity-[50%]">
            Rev share
          </span>
          <span
            className="text-[#5D3014] font-bold cursor-pointer"
            onClick={() => setOpenRoadmapModal(true)}
          >
            Roadmap
          </span>
          <span
            className="text-[#5D3014] font-bold cursor-pointer"
            onClick={() => openJupiterTerminal()}
          >
            $BEGS Swap
          </span>
          {connected ? <ConnectedState /> : <ConnectButton />}
        </div>
      </div>
      <div className="relative flex items-center justify-between w-full mb-4 lg:hidden">
        <div className="lg:hidden">
          <div className="flex items-center justify-center gap-1">
            <img src="/assets/logo-icon-fav.svg" alt="logo" className="w-10 h-10" />
            <p className="text-[20px] leading-tight text-[#5D3014]">BegsFun</p>
          </div>
          <p className="text-[12px] text-[#5D3014] leading-tight mt-[-2px]">
            please send me 1 sol bro
          </p>
        </div>
        <div className="flex lg:hidden items-center justify-center gap-1">
          <>
            {connected ? (
              <div className="flex lg:hidden items-center justify-center gap-1 h-6">
                <ConnectedState isMobile={true} />
              </div>
            ) : (
              <div className="flex lg:hidden items-center justify-center">
                <ConnectButton isMobile={true} />
              </div>
            )}
            <img
              src={
                openMenuIcon
                  ? "/assets/menu-close-icon.svg"
                  : "/assets/menu-icon.svg"
              }
              alt={openMenuIcon ? "close" : "menu"}
              className="w-6 h-6 cursor-pointer"
              onClick={() => setOpenMenuIcon(!openMenuIcon)}
            />
          </>
        </div>
      </div>
      <AnimatePresence>
        {openMenuIcon && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 100, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-0 left-0 right-0 bg-white z-[999] h-[calc(100%-140px)] block lg:hidden"
            onClick={() => setOpenMenuIcon(false)}
          >
            <hr
              className="w-full h-0 border-[0.5px] opacity-100 mb-4"
              style={{ borderColor: "rgba(93, 48, 20, 0.32)" }}
            />
            <div className="px-5">
              <AudioOptions />
            </div>
            <hr
              className="w-full h-0 border-[0.5px] opacity-100 my-4"
              style={{ borderColor: "rgba(93, 48, 20, 0.32)" }}
            />
            <Link href={"/chat"}>
              <div className="w-full flex items-center justify-between px-5">
                <div className="flex items-center gap-3">
                  <img
                    src="/assets/send-live-msg-icon.svg"
                    alt="chat"
                    className="w-8 h-8"
                  />
                  <p className="text-black">BegChat</p>
                </div>
                <img
                  src="/assets/pixelated-arrow-right-icon.svg"
                  alt="nav"
                  className="w-6 h-6"
                />
              </div>
            </Link>
            <hr
              className="w-full h-0 border-[0.5px] opacity-100 my-4"
              style={{ borderColor: "rgba(93, 48, 20, 0.32)" }}
            />
            <Link href={"/swap"}>
              <div className="w-full flex items-center justify-between px-5">
                <div className="flex items-center gap-3">
                  <img
                    src="/assets/begs-swap-icon.svg"
                    alt="swap"
                    className="w-8 h-8"
                  />
                  <p className="text-black">$BEGS Swap</p>
                </div>
                <img
                  src="/assets/pixelated-arrow-right-icon.svg"
                  alt="nav"
                  className="w-6 h-6"
                />
              </div>
            </Link>
            <hr
              className="w-full h-0 border-[0.5px] opacity-100 my-4"
              style={{ borderColor: "rgba(93, 48, 20, 0.32)" }}
            />
            <Link href={"/roadmap"}>
              <div className="w-full flex items-center justify-between px-5">
                <div className="flex items-center gap-3">
                  <img
                    src="/assets/roadmap-icon.svg"
                    alt="swap"
                    className="w-8 h-8"
                  />
                  <p className="text-black">Roadmap</p>
                </div>
                <img
                  src="/assets/pixelated-arrow-right-icon.svg"
                  alt="nav"
                  className="w-6 h-6"
                />
              </div>
            </Link>
            <hr
              className="w-full h-0 border-[0.5px] opacity-100 my-4"
              style={{ borderColor: "rgba(93, 48, 20, 0.32)" }}
            />
            <div className="w-full flex items-center justify-between px-5">
              <button className="py-1 px-3 flex items-center gap-2 border border-[#5D3014] bg-[white] rounded-full opacity-[50%]">
                <img
                  src="/assets/coin-flip-btn-icon.svg"
                  alt="bowl"
                  className="w-6 h-6"
                />
                <span className="text-[14px] font-bold text-[#5D3014]">
                  soon
                </span>
              </button>
              <img
                src="/assets/pixelated-arrow-right-icon.svg"
                alt="nav"
                className="opacity-[50%] w-6 h-6"
              />
            </div>
            <hr
              className="w-full h-0 border-[0.5px] opacity-100 my-4"
              style={{ borderColor: "rgba(93, 48, 20, 0.32)" }}
            />
            <div className="w-full flex items-center justify-between px-5">
              <button className="py-1 px-3 flex items-center gap-2 border border-[#5D3014] bg-[white] rounded-full opacity-[50%]">
                <img
                  src="/assets/dice-btn-icon.svg"
                  alt="bowl"
                  className="w-6 h-6"
                />
                <span className="text-[14px] font-bold text-[#5D3014]">
                  soon
                </span>
              </button>
              <img
                src="/assets/pixelated-arrow-right-icon.svg"
                alt="nav"
                className="opacity-[50%] w-6 h-6"
              />
            </div>
            <hr
              className="w-full h-0 border-[0.5px] opacity-100 my-4"
              style={{ borderColor: "rgba(93, 48, 20, 0.32)" }}
            />
            <div className="w-full flex items-center justify-between px-5">
              <button className="py-1 px-3 flex items-center gap-2 border border-[#5D3014] bg-[white] rounded-full opacity-[50%]">
                <img
                  src="/assets/roulette-btn-icon.svg"
                  alt="bowl"
                  className="w-6 h-6"
                />
                <span className="text-[14px] font-bold text-[#5D3014]">
                  soon
                </span>
              </button>
              <img
                src="/assets/pixelated-arrow-right-icon.svg"
                alt="nav"
                className="opacity-[50%] w-6 h-6"
              />
            </div>
            <hr
              className="w-full h-0 border-[0.5px] opacity-100 my-4"
              style={{ borderColor: "rgba(93, 48, 20, 0.32)" }}
            />
            <img
              src="/assets/menu-end-icon.svg"
              alt="end"
              className="w-full object-cover"
            />
          </motion.div>
        )}
      </AnimatePresence>
      <Modal
        isOpen={openRoadmapModal}
        onClose={() => setOpenRoadmapModal(false)}
      >
        <RoadMapInfo />
      </Modal>
    </>
  );
};

export default AppHeader;
