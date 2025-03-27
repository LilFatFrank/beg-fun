"use client";
import { useEffect, useRef, useState } from "react";
import SocialLinks from "./SocialLinks";
import { Switch } from "./Switch";

const AudioOptions = ({
  isMobile,
}: {
  isMobile?: boolean;
}) => {
  const [musicEnabled, setMusicEnabled] = useState(true);
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);

  const handleMusicChange = (checked: boolean) => {
    setMusicEnabled(checked);
    localStorage.setItem("autoplay-beg-music", String(checked));
    if (bgMusicRef.current) {
      if (checked) {
        bgMusicRef.current.play().catch((error) => {
          console.log("Background music autoplay prevented:", error);
        });
      } else {
        bgMusicRef.current.pause();
      }
    }
  };

  // Initialize music from localStorage
  useEffect(() => {
    const savedMusic = localStorage.getItem("autoplay-beg-music");

    if (savedMusic === null) {
      localStorage.setItem("autoplay-beg-music", "true");
    } else {
      setMusicEnabled(savedMusic === "true");
    }
  }, []);

  // Initialize background music
  useEffect(() => {
    const audio = new Audio("/assets/beg-bg.mp3");
    audio.loop = true;
    audio.volume = 0.15; // Set volume to 25%
    bgMusicRef.current = audio;

    // Start playing when component mounts only if music is enabled
    const playMusic = () => {
      if (bgMusicRef.current && musicEnabled) {
        bgMusicRef.current.play().catch((error) => {
          console.log("Background music autoplay prevented:", error);
        });
      }
    };

    // Try to play immediately if music is enabled
    playMusic();

    // Also try to play on first user interaction if music is enabled
    const handleFirstInteraction = () => {
      if (musicEnabled) {
        playMusic();
      }
      // Remove the event listeners after first interaction
      document.removeEventListener("click", handleFirstInteraction);
      document.removeEventListener("touchstart", handleFirstInteraction);
    };

    document.addEventListener("click", handleFirstInteraction);
    document.addEventListener("touchstart", handleFirstInteraction);

    // Cleanup
    return () => {
      if (bgMusicRef.current) {
        bgMusicRef.current.pause();
        bgMusicRef.current = null;
      }
      document.removeEventListener("click", handleFirstInteraction);
      document.removeEventListener("touchstart", handleFirstInteraction);
    };
  }, [musicEnabled]);
  return (
    <div
      className={`flex items-start justify-center lg:justify-between gap-4 w-full p-3 border border-[#5D3014] rounded-[8px] ${
        isMobile ? "mb-4" : ""
      }`}
    >
      <div className="flex items-center justify-center gap-2">
        <Switch
          size="small"
          checked={musicEnabled}
          onCheckedChange={handleMusicChange}
        />
        <span className="text-black">Music</span>
      </div>
      <SocialLinks />
    </div>
  );
};

export default AudioOptions;
