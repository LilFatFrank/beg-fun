import React, { useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "sonner";
import {
  getRandomVoiceId,
  getRandomVoiceType,
  getWordCount,
  isVideoFile,
  MAX_WORDS,
  MIN_WORDS,
  solAmounts,
  validateSolAmount,
} from "@/utils";

interface CreateBegFormProps {
  isMobile?: boolean;
  onClose?: () => void;
  onSendMessage: (messageData: any) => void;
  isInCooldown: boolean;
  cooldownSeconds: number;
}

export default function CreateBegForm({
  isMobile = false,
  onClose,
  onSendMessage,
  isInCooldown,
  cooldownSeconds,
}: CreateBegFormProps) {
  const { publicKey, connected } = useWallet();
  const [messageText, setMessageText] = useState("");
  const [solAmount, setSolAmount] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Set wallet address when connected
  React.useEffect(() => {
    if (publicKey) {
      setWalletAddress(publicKey.toBase58());
    } else {
      setWalletAddress("");
    }
  }, [publicKey]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const words = getWordCount(text);
    if (words <= MAX_WORDS) {
      setMessageText(text);
      setWordCount(words);
    }
  };

  const handleSolAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const validatedAmount = validateSolAmount(e.target.value);
    setSolAmount(validatedAmount);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    // Log file type for debugging
    console.log("Selected file type:", file.type);

    // Check file size (10MB limit)
    const fileSize = file.size / 1024 / 1024; // size in MB
    if (fileSize > 10) {
      toast.error("File size should be less than 10MB");
      return;
    }

    // Store the file for later upload
    setImageFile(file);

    // Create local preview URL
    const imageUrl = URL.createObjectURL(file);
    setUploadedImage(imageUrl);
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setUploadedImage(null);
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSendMessage = async () => {
    try {
      if (!publicKey) {
        toast.error(`Please connect wallet to beg!`);
        return;
      }

      if (isInCooldown) {
        toast.error(
          `Please wait ${cooldownSeconds}s before sending another message`
        );
        return;
      }

      if (Number(solAmount) <= 0) {
        toast.error(`Sol amount must be greater than 0`);
        return;
      }

      if (uploadingImage) {
        toast.error(`Please wait uploading beg content`);
        return;
      }

      if (!messageText.trim()) {
        toast.error("Please enter a message");
        return;
      }

      const words = getWordCount(messageText);
      if (words < MIN_WORDS) {
        toast.error(`Message must be at least ${MIN_WORDS} words`);
        return;
      }

      if (words > MAX_WORDS) {
        toast.error(`Message cannot exceed ${MAX_WORDS} words`);
        return;
      }

      if (!walletAddress.trim()) {
        toast.error("Please enter a wallet address");
        return;
      }

      if (!solAmount.trim()) {
        toast.error("Please enter a SOL amount");
        return;
      }

      const selectedVoiceType = getRandomVoiceType();
      const selectedVoiceId = getRandomVoiceId(selectedVoiceType);

      // If there's an image file, upload it first
      let imageUrl = null;
      if (imageFile) {
        imageUrl = await getPresignedUrlAndUpload(imageFile);
        if (!imageUrl) {
          toast.error("Image upload failed. Please try again.");
          return;
        }
      }

      const messageData = {
        action: "sendBegMessage",
        walletAddress: walletAddress,
        text: messageText,
        solAmount: solAmount,
        begStatus: "pending",
        voiceType: selectedVoiceType,
        voiceId: selectedVoiceId,
        imageUrl: imageUrl,
      };

      onSendMessage(messageData);

      // Reset form
      setMessageText("");
      setUploadedImage(null);
      setImageFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      if (!connected) setWalletAddress("");
      setSolAmount("");

      // Close the form if it's in a modal
      if (onClose) {
        onClose();
      }
    } catch (error) {
      toast.error("Error sending message");
      console.log(error);
    }
  };

  // Function to generate presigned URL and upload image
  const getPresignedUrlAndUpload = async (
    file: File
  ): Promise<string | null> => {
    try {
      setUploadingImage(true);

      // Request presigned URL
      const response = await fetch(
        "https://7dfinzalu3.execute-api.ap-south-1.amazonaws.com/dev/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            method: "generate_upload_url",
            walletAddress: publicKey?.toBase58() || walletAddress,
            contentType: file.type,
            fileExtension: file.name.split(".").pop(),
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to get presigned URL");
      }

      const data = await response.json();
      console.log("Presigned URL response:", data);

      // Upload file to S3 using presigned URL
      const uploadResponse = await fetch(data.data.uploadUrl, {
        method: "PUT",
        body: file,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error("Upload failed with status:", uploadResponse.status);
        console.error("Upload error:", errorText);
        throw new Error(`Failed to upload image to S3: ${errorText}`);
      }

      return data.data.imageUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image. Please try again.");
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <div className="py-3 px-4 sm:py-4 sm:px-6 rounded-[8px] bg-[#FFD44F] w-full mx-auto">
      <div className="flex flex-col space-y-2">
        <div className="flex items-stretch justify-start gap-3 w-full">
          <div
            className="flex-shrink-0 cursor-pointer border border-[#FFD44F] rounded-[8px] bg-white p-2 flex items-center justify-center self-stretch relative overflow-hidden max-w-[66px] max-h-[66px]"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/avif,.avif,video/mp4,video/webm,video/quicktime,.mov,video/x-msvideo"
              onChange={handleImageUpload}
            />
            {uploadedImage ? (
              <>
                {imageFile && isVideoFile(imageFile) ? (
                  <video
                    src={uploadedImage}
                    className="object-cover"
                    style={{
                      width: "100%",
                      height: "100%",
                    }}
                    muted
                  />
                ) : (
                  <img
                    src={uploadedImage}
                    alt="uploaded preview"
                    className="object-cover"
                    style={{
                      width: "100%",
                      height: "100%",
                    }}
                  />
                )}
                <button
                  onClick={handleRemoveImage}
                  className="absolute top-1 right-1 bg-black bg-opacity-50 rounded-full w-4 h-4 flex items-center justify-center text-white z-10"
                >
                  ×
                </button>
                {uploadingImage && (
                  <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </>
            ) : (
              <img
                src="/assets/upload-image-icon.svg"
                alt="upload"
                className="w-12 h-12"
              />
            )}
          </div>
          <div className="relative w-full flex flex-col">
            <textarea
              placeholder={
                isInCooldown
                  ? `Please wait ${cooldownSeconds}s before sending another message`
                  : `enter your beg request (min. ${MIN_WORDS}, max. ${MAX_WORDS} words)`
              }
              value={messageText}
              onChange={handleMessageChange}
              onKeyDown={handleKeyPress}
              disabled={isInCooldown}
              className="p-2 rounded-[8px] bg-white resize-none text-[14px] sm:text-[16px] outline-none border-none w-full h-full disabled:bg-gray-100 disabled:cursor-not-allowed placeholder:text-[#8F95B2] text-black"
              rows={2}
            />
            <div className="absolute bottom-2 right-2 text-[10px] sm:text-[12px] text-gray-500">
              {wordCount}/{MAX_WORDS}
            </div>
          </div>
        </div>
        <div className="flex-col-reverse flex items-center gap-2">
          <div className="w-full rounded-[8px] bg-white p-2">
            <div className="flex items-center gap-2 mb-1">
              <img
                src="/assets/solana-black-icon.svg"
                alt="solana"
                className="w-5 h-5 sm:w-6 sm:h-6"
              />
              <input
                placeholder="sol amount"
                value={solAmount}
                onChange={handleSolAmountChange}
                step="0.01"
                min="0"
                max="100"
                type="number"
                className="w-full outline-none border-none text-[14px] sm:text-[16px] pr-2 remove-arrow placeholder:text-[#8F95B2] text-black"
              />
            </div>
            <div className="flex items-center justify-start gap-1 flex-wrap">
              {solAmounts.map((sa) => (
                <div
                  key={sa}
                  className={`p-2 rounded-[1000px] flex items-center gap-1 border cursor-pointer ${
                    sa === solAmount
                      ? "border-black bg-[#FFD44F]"
                      : "border-[#FFD44F] bg-black"
                  }`}
                  onClick={() => setSolAmount(sa)}
                >
                  <img
                    src={
                      sa === solAmount
                        ? "/assets/solana-black-icon.svg"
                        : "/assets/solana-yellow-icon.svg"
                    }
                    alt="sol"
                    className="w-3 h-3"
                  />
                  <span
                    className={`${
                      sa === solAmount ? "text-black" : "text-[#FFD44F]"
                    } text-[12px] leading-tight`}
                  >
                    {sa}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="w-full rounded-[8px] bg-white p-2 flex items-center gap-2">
            <img
              src="/assets/phantom-black-icon.svg"
              alt="phantom"
              className="w-5 h-5 sm:w-6 sm:h-6"
            />
            <input
              type="text"
              placeholder="sol address"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              className="w-full outline-none border-none text-[14px] sm:text-[16px] pr-2 placeholder:text-[#8F95B2] text-black"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isMobile && (
            <button
              onClick={onClose}
              className="h-[36px] sm:h-[40px] w-[36px] sm:w-[40px] flex items-center justify-center cursor-pointer bg-black text-[#FFD44F] text-[14px] sm:text-[16px] rounded-full outline-none border-none"
            >
              ✕
            </button>
          )}
          <button
            onClick={handleSendMessage}
            className="flex-1 h-[36px] sm:h-[40px] flex items-center justify-center cursor-pointer gap-2 bg-black text-[#FFD44F] text-[14px] sm:text-[16px] rounded-[8px] outline-none border-none"
          >
            <img
              src="/assets/bolt-icon.svg"
              alt="bolt"
              className="w-3 h-3 sm:w-4 sm:h-4"
            />
            <span className="text-[#FFD44F]">BEG</span>
          </button>
        </div>
      </div>
    </div>
  );
}
