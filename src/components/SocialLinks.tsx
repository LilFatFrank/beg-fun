"use client";

import Link from "next/link";

const SocialLinks = ({ isMobile = false }: { isMobile?: boolean }) => (
  <>
    <div
      className={`${
        isMobile ? "w-full lg:hidden flex pt-3" : "lg:flex hidden"
      } items-center gap-2 justify-center`}
    >
      <Link
        href={`https://t.me/begsfun`}
        target="_blank"
        rel="noreferrer noopener nofollower"
      >
        <img
          src="/assets/telegram-icon.svg"
          alt="telegram"
          className={"w-6 h-6"}
          style={{
            filter: "drop-shadow(0px 4px 8px rgba(93, 48, 20, 0.4))",
          }}
        />
      </Link>
      <Link
        href={`https://x.com/begsfun`}
        target="_blank"
        rel="noreferrer noopener nofollower"
      >
        <img
          src="/assets/x-icon.svg"
          alt="x"
          className={"w-6 h-6"}
          style={{
            filter: "drop-shadow(0px 4px 8px rgba(93, 48, 20, 0.4))",
          }}
        />
      </Link>
      {process.env.NEXT_PUBLIC_DEXTOOLS ? (
        <>
          <Link
            href={process.env.NEXT_PUBLIC_DEXTOOLS}
            target="_blank"
            rel="noreferrer noopener nofollower"
          >
            <img
              src="/assets/dexscreener-icon.svg"
              alt="dexscreener"
              className={"w-6 h-6"}
              style={{
                filter: "drop-shadow(0px 4px 8px rgba(93, 48, 20, 0.4))",
              }}
            />
          </Link>
        </>
      ) : null}
      {process.env.NEXT_PUBLIC_PUMP_ADD ? (
        <>
          <Link
            href={`https://pump.fun/coin/${process.env.NEXT_PUBLIC_PUMP_ADD}`}
            target="_blank"
            rel="noreferrer noopener nofollower"
          >
            <img
              src="/assets/pump-icon.svg"
              alt="pump"
              className={"w-6 h-6"}
              style={{
                filter: "drop-shadow(0px 4px 8px rgba(93, 48, 20, 0.4))",
              }}
            />
          </Link>
        </>
      ) : null}
    </div>
  </>
);

export default SocialLinks;
