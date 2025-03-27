"use client";
import React from "react";

const Footer = () => (
  <div className="bg-[#FFD44F] h-[40px] flex items-center overflow-hidden whitespace-nowrap">
    <div className="flex w-fit animate-marquee">
      {/* First set of items */}
      {process.env.NEXT_PUBLIC_PUMP_ADD ? (
        <>
          {Array(5)
            .fill(null)
            .map((_, i) => (
              <React.Fragment key={`first-extended-${i}`}>
                <span className="mx-4 text-[#5D3014] font-bold">
                  it ain't gay, it ain't racist, it's finance fellas
                </span>
                <img
                  src="/assets/mcd-bottom-bar-icon.svg"
                  alt="mcd"
                  className="w-6 h-6 inline-block"
                />
                <span className="mx-4 text-[#5D3014] font-bold">$BEGS</span>
                <img
                  src="/assets/mcd-bottom-bar-icon.svg"
                  alt="mcd"
                  className="w-6 h-6 inline-block"
                />
                <span className="mx-4 text-[#5D3014] font-bold">
                  ca: {process.env.NEXT_PUBLIC_PUMP_ADD}
                </span>
                <img
                  src="/assets/mcd-bottom-bar-icon.svg"
                  alt="mcd"
                  className="w-6 h-6 inline-block"
                />
              </React.Fragment>
            ))}
        </>
      ) : (
        <>
          {Array(10)
            .fill("it ain't gay, it ain't racist, it's finance fellas")
            .map((text, i) => (
              <React.Fragment key={`first-${i}`}>
                <span className="mx-4 text-[#5D3014] font-bold">{text}</span>
                <img
                  src="/assets/mcd-bottom-bar-icon.svg"
                  alt="mcd"
                  className="w-6 h-6 inline-block"
                />
              </React.Fragment>
            ))}
        </>
      )}
      {/* Duplicate set for seamless loop */}
      {process.env.NEXT_PUBLIC_PUMP_ADD ? (
        <>
          {Array(5)
            .fill(null)
            .map((_, i) => (
              <React.Fragment key={`second-extended-${i}`}>
                <span className="mx-4 text-[#5D3014] font-bold">
                  it ain't gay, it ain't racist, it's finance fellas
                </span>
                <img
                  src="/assets/mcd-bottom-bar-icon.svg"
                  alt="mcd"
                  className="w-6 h-6 inline-block"
                />
                <span className="mx-4 text-[#5D3014] font-bold">$BEGS</span>
                <img
                  src="/assets/mcd-bottom-bar-icon.svg"
                  alt="mcd"
                  className="w-6 h-6 inline-block"
                />
                <span className="mx-4 text-[#5D3014] font-bold">
                  ca: {process.env.NEXT_PUBLIC_PUMP_ADD}
                </span>
                <img
                  src="/assets/mcd-bottom-bar-icon.svg"
                  alt="mcd"
                  className="w-6 h-6 inline-block"
                />
              </React.Fragment>
            ))}
        </>
      ) : (
        <>
          {Array(10)
            .fill("it ain't gay, it ain't racist, it's finance fellas")
            .map((text, i) => (
              <React.Fragment key={`second-${i}`}>
                <span className="mx-4 text-[#5D3014] font-bold">{text}</span>
                <img
                  src="/assets/mcd-bottom-bar-icon.svg"
                  alt="mcd"
                  className="w-6 h-6 inline-block"
                />
              </React.Fragment>
            ))}
        </>
      )}
    </div>
  </div>
);

export default Footer;
