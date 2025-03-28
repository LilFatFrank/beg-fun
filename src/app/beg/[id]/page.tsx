"use client";
import BackToBegs from "@/components/BackToBegs";
import DonateComponent from "@/components/DonateComponent";
import MessageText from "@/components/MessageText";
import Modal from "@/components/Modal";
import PlayPauseButton from "@/components/PlayPauseButton";
import { ReactionsType } from "@/interfaces";
import {
  detectSolanaAddress,
  formatMessageTime,
  getFlagIcon,
  getRandomVoiceId,
  getRandomVoiceType,
  isVideoUrl,
  reactions,
} from "@/utils";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { useRouter } from "next/navigation";
import { FC, memo, use, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Virtuoso } from "react-virtuoso";
import DonateButton from "@/components/DonateButton";

const ClientPage: FC<{ params: Promise<{ id: string }> }> = memo(({ params }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isDonating, setIsDonating] = useState(false);
  const [message, setMessage] = useState<{
    walletAddress: string;
    text: string;
    solAmount: string;
    _id: string;
    begStatus: string;
    timestamp: string;
    voiceType: string;
    voiceId: string;
    fillAmount: string;
    reactions: ReactionsType;
    imageUrl?: string;
  } | null>(null);
  const messageRef = useRef(message);
  messageRef.current = message;
  const [reactionsMessageId, setReactionsMessageId] = useState<string | null>(
    null
  );
  const [viewImageModal, setViewImageModal] = useState<{
    isOpen: boolean;
    imageUrl: string;
    isVideo: boolean;
  }>({
    isOpen: false,
    imageUrl: "",
    isVideo: false,
  });
  const websocketRef = useRef<WebSocket | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [comment, setComment] = useState("");
  const websocketRetries = useRef(0);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { id } = use(params);
  const { connected, publicKey, sendTransaction } = useWallet();
  const { push } = useRouter();
  const [isMessageExpanded, setIsMessageExpanded] = useState(false);
  const [expandedMessage, setExpandedMessage] = useState("");
  const [deletingCommentIds, setDeletingCommentIds] = useState<string[]>([]);
  const [comments, setComments] = useState<
    {
      _id: string;
      walletAddress: string;
      text: string;
      timestamp: string;
      voiceType: string;
      voiceId: string;
      imageUrl?: string;
    }[]
  >([]);
  const [commentsPagination, setCommentsPagination] = useState({
    total_count: 0,
    page: 1,
    limit: 20,
    total_pages: 1,
    has_next: false,
    has_prev: false,
  });
  const [isSendingComment, setIsSendingComment] = useState(false);

  const connection = new Connection(process.env.NEXT_PUBLIC_RPC!);
  const adminWallets = process.env.NEXT_PUBLIC_ADMIN_WALLETS
    ? process.env.NEXT_PUBLIC_ADMIN_WALLETS.split(",")
    : [];

  const setupWebSocket = useCallback(() => {
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    if (websocketRef.current) {
      websocketRef.current.close();
    }

    websocketRef.current = new WebSocket(
      "wss://q1qqf9y8gb.execute-api.ap-south-1.amazonaws.com/dev/"
    );

    websocketRef.current.onopen = () => {
      console.log("WebSocket connection established");
      websocketRetries.current = 0;
      pingIntervalRef.current = setInterval(() => {
        if (websocketRef.current?.readyState === WebSocket.OPEN) {
          websocketRef.current.send(JSON.stringify({ type: "ping" }));
        }
      }, 30000);
    };

    websocketRef.current.onmessage = (event) => {
      try {
        const receivedMessage = JSON.parse(event.data);
        if (
          receivedMessage.type === "begMessageDeleted" ||
          receivedMessage.type === "begMessageDeletedConfirmation"
        ) {
          push("/");
        } else if (
          receivedMessage.type === "begMessageReaction" ||
          receivedMessage.type === "begMessageReactionConfirmation"
        ) {
          if (messageRef.current && receivedMessage.message_id && messageRef.current._id === receivedMessage.message_id) {
            setMessage({
              ...messageRef.current,
              reactions: receivedMessage.reaction_counts
            });
          }
          if (receivedMessage.action === "added") {
            const reactionAudio = reactions.find(
              (r) => r.val === receivedMessage.reaction_type
            )?.audio;
            if (reactionAudio) {
              const audio = new Audio(reactionAudio);
              audio.volume = 0.6;
              audio.play().catch((error) => {
                console.error("Error playing reaction audio:", error);
              });
            }
          }
        } else if (
          receivedMessage.type === "begCommentConfirmation" ||
          receivedMessage.type === "begComment"
        ) {
          setComments((prevComments) => [
            {
              _id: receivedMessage.comment_id,
              walletAddress: receivedMessage.walletAddress,
              text: receivedMessage.text,
              timestamp: receivedMessage.timestamp,
              voiceType: receivedMessage.voiceType,
              voiceId: receivedMessage.voiceId,
              imageUrl: receivedMessage.imageUrl,
            },
            ...prevComments,
          ]);
          setCommentsPagination((prev) => ({
            ...prev,
            total_count: prev.total_count + 1,
          }));
        } else if (
          receivedMessage.type === "begCommentDeletedConfirmation" ||
          receivedMessage.type === "begCommentDeleted"
        ) {
          setDeletingCommentIds((prev) =>
            prev.filter((id) => id !== receivedMessage.comment_id)
          );
          setComments((prevComments) =>
            prevComments.filter(
              (comment) => comment._id !== receivedMessage.comment_id
            )
          );
          if (receivedMessage.type === "begCommentDeletedConfirmation") {
            toast.success("Comment deleted by admin!");
          }
        }
      } catch (error) {
        toast.error("Error parsing message");
        console.error("Error parsing message:", error);
      }
    };

    websocketRef.current.onclose = () => {
      console.log("WebSocket connection closed");
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }

      setTimeout(() => {
        console.log("Reconnecting WebSocket...");
        setupWebSocket();
      }, Math.min(1000 * Math.pow(2, websocketRetries.current++), 30000));
    };

    websocketRef.current.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  }, [message]);

  useEffect(() => {
    setupWebSocket();

    // Cleanup function when component unmounts
    return () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }

      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
  }, [setupWebSocket]);

  const deleteBegMessage = (messageId: string) => {
    try {
      if (
        websocketRef.current &&
        websocketRef.current.readyState === WebSocket.OPEN
      ) {
        websocketRef.current.send(
          JSON.stringify({
            action: "deleteBegMessage",
            messageId,
            walletAddress: publicKey?.toBase58(),
          })
        );
        console.log(`Delete request sent for message: ${messageId}`);
      } else {
        console.error("WebSocket connection not open");
        toast.error("Connection error. Please refresh the page.");
      }
    } catch (error) {
      console.log("error", error);
    }
  };

  const deleteComment = (commentId: string) => {
    try {
      if (
        websocketRef.current &&
        websocketRef.current.readyState === WebSocket.OPEN
      ) {
        setDeletingCommentIds((prev) => [...prev, commentId]);

        websocketRef.current.send(
          JSON.stringify({
            action: "deleteBegComment",
            commentId,
            walletAddress: publicKey?.toBase58(),
          })
        );
        console.log(`Delete request sent for message: ${commentId}`);
      } else {
        console.error("WebSocket connection not open");
        toast.error("Connection error. Please refresh the page.");
      }
    } catch (error) {
      console.log("error", error);
    }
  };

  const reactToBegMessage = (messageId: string, reactionType: string) => {
    if (
      !websocketRef.current ||
      websocketRef.current.readyState !== WebSocket.OPEN
    ) {
      console.error("WebSocket connection not open");
      return;
    }

    websocketRef.current.send(
      JSON.stringify({
        action: "reactToBegMessage",
        messageId,
        walletAddress: publicKey?.toBase58(),
        reactionType,
      })
    );
  };

  const handleDonate = async (
    recipientAddress: string,
    amount: string,
    messageId: string
  ) => {
    try {
      setIsDonating(true);
      if (!publicKey) {
        toast.info("Connect wallet to donate!");
        return;
      }
      if (!message) {
        toast.error("Message not found!");
        return;
      }
      // Validate recipient address is a valid base58 string
      if (!detectSolanaAddress(recipientAddress)) {
        toast.error("Invalid recipient wallet address");
        return;
      }

      // Validate admin account address is a valid base58 string
      if (
        !process.env.NEXT_PUBLIC_BEG_ADMIN_ACCOUNT ||
        !detectSolanaAddress(process.env.NEXT_PUBLIC_BEG_ADMIN_ACCOUNT)
      ) {
        toast.error("Invalid admin wallet address");
        return;
      }

      const transferAmount = Number(amount) * LAMPORTS_PER_SOL;
      const fee_percent = 1;

      const toPubkey = new PublicKey(recipientAddress);
      const feePubkey = new PublicKey(
        process.env.NEXT_PUBLIC_BEG_ADMIN_ACCOUNT!
      );

      const lamports = Math.round(transferAmount);
      const sendAmount = Math.round((lamports * (100 - fee_percent)) / 100);
      const feeAmount = Math.round((lamports * fee_percent) / 100);

      const transaction = new Transaction();

      // Get fresh blockhash
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash("finalized");
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      transaction.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey,
          lamports: sendAmount,
        }),
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: feePubkey,
          lamports: feeAmount,
        })
      );

      const signature = await sendTransaction(transaction, connection);

      // Confirm transaction with proper blockhash info
      const confirmation = await connection.confirmTransaction(
        {
          signature,
          blockhash,
          lastValidBlockHeight,
        },
        "confirmed"
      );

      if (confirmation.value.err) {
        toast.error("Donation failed!");
        throw new Error("Transaction failed");
      }

      const newFillAmount = Number(message.fillAmount) + Number(amount);
      const isFilled = newFillAmount >= Number(message.solAmount);

      websocketRef.current?.send(
        JSON.stringify({
          action: "updateBegMessage",
          messageId,
          walletAddress: publicKey?.toBase58(),
          updates: {
            begStatus: isFilled ? "completed" : "pending",
            fillAmount: newFillAmount.toString(),
          },
        })
      );
    } catch (error) {
      toast.error("Could not make donation!");
      console.log("Transaction error:", error);
    } finally {
      setIsDonating(false);
    }
  };

  const fetchMessageDetail = useCallback(async () => {
    if (!id) return;

    try {
      const response = await fetch(
        `https://7dfinzalu3.execute-api.ap-south-1.amazonaws.com/dev/?method=get_beg_message&messageId=${id}`
      );
      const data = await response.json();
      setMessage(data.data);
    } catch (error) {
      toast.error("Could not fetch beg details!");
      console.error("Error fetching comments:", error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const fetchInitialComments = useCallback(async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      const response = await fetch(
        `https://7dfinzalu3.execute-api.ap-south-1.amazonaws.com/dev/?method=get_beg_comments&begMessageId=${id}&page=1&limit=${commentsPagination.limit}`
      );
      const data = await response.json();
      setComments(data.data);
      setCommentsPagination(data.pagination);
    } catch (error) {
      toast.error("Could not fetch comments!");
      console.error("Error fetching comments:", error);
    } finally {
      setIsLoading(false);
    }
  }, [id, commentsPagination.limit]);

  const fetchMoreComments = useCallback(async () => {
    if (!commentsPagination.has_next || isLoadingMore) return;

    try {
      setIsLoadingMore(true);
      const nextPage = commentsPagination.page + 1;

      const response = await fetch(
        `https://7dfinzalu3.execute-api.ap-south-1.amazonaws.com/dev/?method=get_beg_comments&begMessageId=${id}&page=${nextPage}&limit=${commentsPagination.limit}`
      );
      const data = await response.json();
      setComments((prevComments) => [...prevComments, ...data.data]);
      setCommentsPagination(data.pagination);
    } catch (error) {
      toast.error("Error loading more comments");
      console.error("Error loading more comments:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    commentsPagination.has_next,
    commentsPagination.page,
    commentsPagination.limit,
    isLoadingMore,
    id,
  ]);

  useEffect(() => {
    if (id) {
      fetchMessageDetail();
      fetchInitialComments();
    }
  }, [id]);

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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendComment();
    }
  };

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
            walletAddress: publicKey?.toBase58(),
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

  const handleSendComment = async () => {
    try {
      if (isSendingComment) {
        toast.error("Please wait while sending comment");
        return;
      }

      if (!comment.trim()) {
        toast.error("Please enter a message");
        return;
      }

      if (!connected) {
        toast.error("Please connect to comment!");
        return;
      }

      if (websocketRef.current?.readyState !== WebSocket.OPEN) {
        toast.error("Connection error. Please try again.");
        return;
      }

      setIsSendingComment(true);
      const selectedVoiceType = getRandomVoiceType();
      const selectedVoiceId = getRandomVoiceId(selectedVoiceType);

      let imageUrl = null;
      if (imageFile) {
        imageUrl = await getPresignedUrlAndUpload(imageFile);
        if (!imageUrl) {
          toast.error("Image upload failed. Please try again.");
          return;
        }
      }

      const messageData = {
        action: "addBegComment",
        begMessageId: id,
        walletAddress: publicKey?.toBase58(),
        text: comment,
        voiceType: selectedVoiceType,
        voiceId: selectedVoiceId,
        imageUrl: imageUrl,
      };

      websocketRef.current.send(JSON.stringify(messageData));

      setComment("");
      setUploadedImage(null);
      setImageFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      toast.error("Error sending message");
      console.log(error);
    } finally {
      setIsSendingComment(false);
    }
  };

  return (
    <>
      <div className="w-full flex flex-col items-start justify-start gap-4 h-full">
        <BackToBegs />
        <div
          className="grow h-full w-full bg-gradient-to-b from-[#FFFFFF] to-[#FFEFBE] border rounded-2xl shadow-[0px_4px_20px_0px_rgba(255,212,72,0.25)] lg:px-6 px-3 overflow-auto"
          style={{ borderColor: "rgba(255, 212, 72, 0.72)" }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-4 border-[#FFD44F] border-t-[#5D3014] rounded-full animate-spin"></div>
            </div>
          ) : message ? (
            <>
              <div className="w-full flex items-stretch justify-start gap-4 lg:mt-6 mt-3">
                <div
                  className="lg:basis-2/3 w-full rounded-[8px] border p-4 flex items-start gap-2"
                  style={{ borderColor: "rgba(93, 48, 20, 0.32)" }}
                >
                  <img
                    src={getFlagIcon(message.voiceType)}
                    alt={message.voiceType.toLowerCase()}
                    className="w-5 h-5 sm:w-6 sm:h-6"
                  />
                  <div className="flex flex-col gap-4 w-full h-full items-start justify-between">
                    <div className="flex flex-col gap-4 w-full items-start">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <a
                            href={`https://solscan.io/account/${message.walletAddress}`}
                            target="_blank"
                            rel="noreferrer noopener nofollower"
                            className="font-[Montserrat] text-[#5D3014] font-medium text-[12px] hover:underline"
                          >
                            {message.walletAddress.slice(0, 4)}...
                            {message.walletAddress.slice(-4)}
                          </a>
                          <div className="w-1 h-1 rounded-full bg-[#FFD44F] flex-shrink-0" />
                          <span className="font-[Montserrat] font-medium text-[12px] text-[#5D3014]">
                            {formatMessageTime(message.timestamp)}
                          </span>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          {adminWallets.length &&
                          connected &&
                          adminWallets.includes(publicKey?.toBase58()!) ? (
                            <>
                              <img
                                src="/assets/delete-icon.svg"
                                alt="delete"
                                className="w-4 h-4 cursor-pointer"
                                onClick={() => deleteBegMessage(message._id)}
                              />
                            </>
                          ) : null}
                          <PlayPauseButton
                            text={message.text}
                            voiceId={message.voiceId}
                            className="flex-shrink-0"
                          />
                          <div
                            className="relative"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!connected) {
                                toast.error("Connect wallet to react!");
                                return;
                              }
                              setReactionsMessageId(
                                reactionsMessageId === message._id
                                  ? null
                                  : message._id
                              );
                            }}
                          >
                            {reactionsMessageId === message._id ? (
                              <div className="absolute right-0 top-[120%] z-[9] rounded-[2000px] py-2 px-4 bg-[#FFEFBD] flex items-center gap-2 w-max">
                                {reactions.map((r) => (
                                  <div
                                    key={r.val}
                                    className={`cursor-pointer flex-shrink-0 p-1 rounded-full border bg-white`}
                                    style={{
                                      borderColor: r.color,
                                      boxShadow: `1px 1px 0px 0px ${r.color}`,
                                    }}
                                    onClick={() => {
                                      reactToBegMessage(message._id, r.val);
                                      setReactionsMessageId(null);
                                    }}
                                  >
                                    <img
                                      src={r.icon}
                                      alt={r.val}
                                      style={{
                                        width: "16px",
                                        height: "16px",
                                      }}
                                    />
                                  </div>
                                ))}
                              </div>
                            ) : null}
                            <img
                              src="/assets/reactions-icon.svg"
                              about="reaction"
                              className="w-6 h-6 rounded-full cursor-pointer shadow-[0px_4px_8px_0px_rgba(0,0,0,0.25)]"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="w-full flex items-start lg:gap-4 gap-2">
                        {message.imageUrl ? (
                          // Check if it's a video by extension
                          isVideoUrl(message.imageUrl) ? (
                            <div
                              className="relative w-[80px] h-[80px] flex-shrink-0 rounded-[4px] cursor-pointer overflow-hidden"
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewImageModal({
                                  isOpen: true,
                                  imageUrl: message.imageUrl!,
                                  isVideo: true,
                                });
                              }}
                            >
                              <video
                                src={message.imageUrl}
                                className="w-full h-full object-cover"
                                muted
                              />
                              {/* Video play indicator overlay */}
                              <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                                <img
                                  src="/assets/play-icon.svg"
                                  alt="play video"
                                  className="w-8 h-8 opacity-80"
                                />
                              </div>
                            </div>
                          ) : (
                            <img
                              src={message.imageUrl}
                              alt="message attachment"
                              className="w-[80px] h-[80px] flex-shrink-0 object-contain rounded-[4px] cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewImageModal({
                                  isOpen: true,
                                  imageUrl: message.imageUrl!,
                                  isVideo: false,
                                });
                              }}
                            />
                          )
                        ) : null}
                        <MessageText
                          text={message.text}
                          setIsExpanded={(val) => {
                            setIsMessageExpanded(val);
                            setExpandedMessage(message.text);
                          }}
                          lines={4}
                        />
                      </div>
                    </div>
                    <div className="w-full flex-col flex items-start gap-4 mt-auto">
                      <div className="w-full flex-col flex items-start gap-4 lg:hidden">
                        <div className="flex items-center justify-start gap-2 w-full">
                          <div className="relative w-full h-[12px] bg-[#FFD44F] rounded-[200px] overflow-hidden">
                            <div
                              className="absolute top-0 left-0 h-full transition-all duration-300"
                              style={{
                                width: `${Math.min(
                                  100,
                                  (Number(message.fillAmount) /
                                    Number(message.solAmount)) *
                                    100
                                )}%`,
                                background:
                                  "linear-gradient(to right, #009A49, #29F188)",
                              }}
                            />
                          </div>
                        </div>
                        {message.begStatus === "completed" ? (
                          <div className="rounded-[8px] h-full w-full px-4 py-1 border border-black flex items-center gap-2 bg-[#FFD44F] shadow-[inset_0px_4px_8px_0px_rgba(0,0,0,0.25)]">
                            <img
                              src="/assets/check-fulfilled-icon.svg"
                              alt="solana"
                              className="w-4 h-4"
                              loading="lazy"
                            />
                            <p className="text-[#5D3014] text-[14px]">
                              Beg fulfilled
                            </p>
                          </div>
                        ) : (
                          <div
                            className="w-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                            }}
                          >
                            <DonateButton
                              handleDonate={handleDonate}
                              donatingMessageId={isDonating ? id : ""}
                              msg={message}
                            />
                          </div>
                        )}
                      </div>
                      {message.reactions &&
                      Object.keys(message.reactions).length ? (
                        <div className="flex items-center justify-start gap-2">
                          {reactions.map((r) =>
                            message.reactions[
                              r.val as keyof typeof message.reactions
                            ] ? (
                              <div
                                key={r.val}
                                className={`flex-shrink-0 p-1 rounded-full border bg-white flex items-center gap-1 cursor-pointer`}
                                style={{
                                  borderColor: r.color,
                                  boxShadow: `1px 1px 0px 0px ${r.color}`,
                                }}
                                onClick={() => {
                                  if (!connected) {
                                    toast.error("Connect wallet to react!");
                                    return;
                                  }
                                  reactToBegMessage(message._id, r.val);
                                  setReactionsMessageId(null);
                                }}
                              >
                                <img
                                  src={r.icon}
                                  alt={r.val}
                                  style={{
                                    width: "16px",
                                    height: "16px",
                                  }}
                                />
                                <p className="font-[Montserrat] text-[12px] text-black">
                                  {
                                    message.reactions[
                                      r.val as keyof typeof message.reactions
                                    ]
                                  }
                                </p>
                              </div>
                            ) : null
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div
                  className="lg:basis-1/3 hidden rounded-[8px] border p-4 lg:flex items-start gap-2 w-full"
                  style={{ borderColor: "rgba(93, 48, 20, 0.32)" }}
                >
                  <DonateComponent
                    fillAmount={message.fillAmount}
                    solAmount={message.solAmount}
                    onDonate={(amount) =>
                      handleDonate(message.walletAddress, amount, message._id)
                    }
                    isDonating={isDonating}
                    inputBackground="bg-inherit"
                  />
                </div>
              </div>
              <div
                className={`w-full flex items-center justify-start gap-4 mt-[8px]`}
              >
                <div
                  className="lg:basis-2/3 w-full rounded-[8px] border px-4 py-3 flex items-center gap-2"
                  style={{ borderColor: "rgba(93, 48, 20, 0.32)" }}
                >
                  <div
                    className="flex-shrink-0 cursor-pointer flex items-center justify-center self-stretch relative overflow-hidden gap-1"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/avif,.avif"
                      onChange={handleImageUpload}
                    />
                    {uploadedImage ? (
                      <>
                        {
                          <img
                            src={uploadedImage}
                            alt="uploaded preview"
                            className="object-cover"
                            style={{
                              width: "24px",
                              height: "24px",
                            }}
                          />
                        }
                      </>
                    ) : (
                      <img
                        src="/assets/upload-image-comment-icon.svg"
                        alt="upload"
                        className="w-6 h-6"
                      />
                    )}
                    {uploadedImage ? (
                      <button
                        onClick={handleRemoveImage}
                        className="rounded-full w-4 h-4 flex items-center justify-center text-[#5D3014] cursor-pointer"
                      >
                        ×
                      </button>
                    ) : null}
                  </div>
                  <input
                    className="grow outline-none border-none text-[14px] placeholder:text-[rgba(93,48,20,0.4)]"
                    placeholder="drop a comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    onKeyDown={handleKeyPress}
                  />
                  <button
                    className="cursor-pointer border border-[#5D3014] rounded-full py-1 px-3 bg-[#FFD44F] flex items-center gap-2"
                    onClick={handleSendComment}
                    disabled={isSendingComment || uploadingImage}
                  >
                    <img
                      src="/assets/comment-icon.svg"
                      alt="comment"
                      className="w-4 h-4"
                    />
                    <span className="text-[#5D3014] font-bold text-[14px] hidden lg:block">
                      Comment
                    </span>
                  </button>
                </div>
                <div className="lg:basis-1/3">
                  <p
                    className="text-[14px] w-full text-[#5D3014] cursor-pointer"
                    onClick={(e) => {
                      handleRemoveImage(e);
                      setComment("");
                    }}
                  >
                    Cancel
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <Virtuoso
                  style={{ height: "400px" }}
                  totalCount={comments.length}
                  itemContent={(index) => {
                    const comment = comments[index];
                    const isBeingDeleted = deletingCommentIds.includes(
                      comment._id
                    );
                    return (
                      <div
                        key={comment._id}
                        className={`py-3 border-b-[0.5px] ${
                          isBeingDeleted
                            ? "opacity-50 pointer-events-none"
                            : "opacity-100"
                        }`}
                        style={{ borderColor: "rgba(9, 48, 29, 0.32)" }}
                      >
                        <div className="flex items-center gap-2 justify-between">
                          <div className="flex items-center gap-2">
                            <img
                              src={getFlagIcon(comment.voiceType)}
                              alt={comment.voiceType.toLowerCase()}
                              className="w-5 h-5"
                            />
                            <a
                              href={`https://solscan.io/account/${comment.walletAddress}`}
                              target="_blank"
                              rel="noreferrer noopener nofollower"
                              className="font-[Montserrat] text-[#5D3014] font-medium text-[12px] hover:underline"
                            >
                              {comment.walletAddress.slice(0, 4)}...
                              {comment.walletAddress.slice(-4)}
                            </a>
                            <div className="w-1 h-1 rounded-full bg-[#FFD44F]" />
                            <span className="font-[Montserrat] font-medium text-[12px] text-[#5D3014]">
                              {formatMessageTime(comment.timestamp)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mr-3">
                            {adminWallets.length &&
                            connected &&
                            adminWallets.includes(publicKey?.toBase58()!) ? (
                              <>
                                <img
                                  src="/assets/delete-icon.svg"
                                  alt="delete"
                                  className="w-4 h-4 cursor-pointer"
                                  onClick={() => deleteComment(comment._id)}
                                />
                              </>
                            ) : null}
                            <PlayPauseButton
                              text={comment.text}
                              voiceId={comment.voiceId}
                              className="flex-shrink-0"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {comment.imageUrl && (
                            <img
                              src={comment.imageUrl}
                              alt="comment attachment"
                              className="cursor-pointer w-[56px] h-[56px] lg:w-20 lg:h-20 object-cover rounded-[4px]"
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewImageModal({
                                  isOpen: true,
                                  imageUrl: comment.imageUrl!,
                                  isVideo: false,
                                });
                              }}
                            />
                          )}
                          <p className="text-[14px] text-[#5D3014]">
                            {comment.text}
                          </p>
                        </div>
                      </div>
                    );
                  }}
                  endReached={() => {
                    if (commentsPagination.has_next && !isLoadingMore) {
                      fetchMoreComments();
                    }
                  }}
                  components={{
                    Footer: () => (
                      <div className="flex items-center justify-center py-4">
                        {isLoadingMore ? (
                          <div className="w-6 h-6 border-3 border-[#FFD44F] border-t-[#5D3014] rounded-full animate-spin"></div>
                        ) : commentsPagination.has_next ? (
                          <span className="text-[#5D3014] text-sm">
                            Scroll for more
                          </span>
                        ) : null}
                      </div>
                    ),
                  }}
                />
              </div>
            </>
          ) : (
            null
          )}
        </div>
      </div>
      <Modal
        isOpen={viewImageModal.isOpen}
        onClose={() =>
          setViewImageModal({ isOpen: false, imageUrl: "", isVideo: false })
        }
        style={{ background: "transparent", border: "none" }}
      >
        <div className="flex justify-center items-center h-full w-full">
          {viewImageModal.isVideo ? (
            <video
              src={viewImageModal.imageUrl}
              controls
              autoPlay
              className="max-w-full max-h-[80vh] object-contain rounded-[8px]"
            />
          ) : (
            <img
              src={viewImageModal.imageUrl}
              alt="Full size attachment"
              className="max-w-full max-h-[80vh] object-contain rounded-[8px]"
            />
          )}
        </div>
      </Modal>
      <Modal
        isOpen={isMessageExpanded}
        onClose={() => setIsMessageExpanded(false)}
      >
        <div className="text-[14px] sm:text-[16px] break-all text-black">
          {expandedMessage}
        </div>
      </Modal>
    </>
  );
});

export default ClientPage;
