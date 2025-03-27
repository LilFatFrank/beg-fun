"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const PlayPauseButton = ({
  text,
  voiceId,
  className,
}: {
  text: string;
  voiceId: string;
  className?: string;
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handlePlayPause = async () => {
    if (isLoading) return;

    if (audio) {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        audio.play();
        setIsPlaying(true);
      }
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: "POST",
          headers: {
            Accept: "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || "",
          },
          body: JSON.stringify({
            text,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.5,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      const newAudio = new Audio(url);

      newAudio.addEventListener("ended", () => {
        setIsPlaying(false);
      });

      newAudio.addEventListener("pause", () => {
        setIsPlaying(false);
      });

      setAudio(newAudio);
      newAudio.play();
      setIsPlaying(true);
    } catch (error) {
      console.error("Error generating speech:", error);
      toast.error("Error generating speech");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (audio) {
        audio.pause();
        URL.revokeObjectURL(audio.src);
      }
    };
  }, [audio]);

  return (
    <motion.button
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        handlePlayPause();
      }}
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`cursor-pointer ${className}`}
      disabled={isLoading}
    >
      {isLoading ? (
        <div className="w-6 h-6">
          <div className="animate-spin rounded-full h-full w-full border-b-2 border-[#5D3014]"></div>
        </div>
      ) : (
        <img
          src={isPlaying ? "/assets/pause-icon.svg" : "/assets/play-icon.svg"}
          alt={isPlaying ? "pause" : "play"}
          className="w-6 h-6 rounded-full shadow-[0px_4px_8px_0px_rgba(0,0,0,0.25)]"
        />
      )}
    </motion.button>
  );
};

export default PlayPauseButton;
