"use client";
import BackToBegs from "@/components/BackToBegs";
import { openJupiterTerminal } from "@/utils";
import { useEffect } from "react";

export default function Page() {
  useEffect(() => {
    openJupiterTerminal("integrated");
  }, []);

  return (
    <>
    <BackToBegs />
      <div
        id="integrated-terminal"
        style={{
          background: "rgba(0, 0, 0, 0.75)",
          borderRadius: "8px",
          marginTop: "16px"
        }}
      ></div>
    </>
  );
}
