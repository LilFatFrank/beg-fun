import {
  formatMessageTime,
  getFlagIcon,
  formatSolAmount,
  isVideoUrl,
} from "@/utils";
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "BegsFun - Beg Details";
export const size = {
  width: 1200,
  height: 630,
};

// Helper function to truncate text and add "...view more"
function truncateText(text: string, maxLength = 150) {
  // Reduced to accommodate "view more"
  if (text.length <= maxLength) return text;
  return <>{text.slice(0, maxLength)}...</>;
}

export default async function Image({ params }: { params: { id: string } }) {
  // Load the font
  const fontData = await fetch(
    new URL("/fonts/Ldfcomicsans-jj7l.ttf", "https://www.begsfun.xyz")
  ).then((res) => res.arrayBuffer());

  try {
    const response = await fetch(
      `https://7dfinzalu3.execute-api.ap-south-1.amazonaws.com/dev/?method=get_beg_message&messageId=${params.id}`
    );
    const data = await response.json();
    const beg = data.data;

    if (!beg) {
      return new ImageResponse(
        (
          <div
            style={{
              background: "linear-gradient(to bottom, #FFFFFF, #FFEFBE)",
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "Comic Sans MS",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "24px",
              }}
            >
              <img
                src="https://www.begsfun.xyz/assets/logo-icon.svg"
                width="68"
                height="68"
                alt="BegsFun"
              />
              <span
                style={{
                  fontSize: "32px",
                  color: "#5D3014",
                  fontWeight: "bold",
                }}
              >
                BegsFun
              </span>
            </div>
            <p style={{ fontSize: "24px", color: "#5D3014" }}>beg not found</p>
          </div>
        ),
        {
          ...size,
          fonts: [
            {
              name: "Comic Sans MS",
              data: fontData,
              style: "normal",
              weight: 400,
            },
          ],
        }
      );
    }

    return new ImageResponse(
      (
        <>
          <div
            style={{
              background: "linear-gradient(to bottom, #FFFFFF, #FFEFBE)",
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            {/* Logo Section */}
            <div
              style={{
                position: "absolute",
                top: "24px",
                left: "24px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "16px" }}
              >
                <img
                  src="https://www.begsfun.xyz/assets/logo-icon.svg"
                  width="48"
                  height="48"
                  alt="BegsFun"
                />
                <span
                  style={{
                    fontSize: "32px",
                    color: "#5D3014",
                    fontWeight: "bold",
                  }}
                >
                  BegsFun
                </span>
              </div>
              <p style={{ margin: 0, fontSize: "16px", color: "#5D3014" }}>
                please send me 1 sol bro
              </p>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                justifyContent: "center",
                gap: "16px",
                width: "60%",
                margin: "auto",
                height: "100%",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  gap: 8,
                }}
              >
                <img
                  src={`https://www.begsfun.xyz${getFlagIcon(beg.voiceType)}`}
                  alt={beg.voiceType}
                  width={40}
                  height={40}
                />
                <p
                  style={{
                    color: "#5D3014",
                    fontWeight: "bold",
                    fontSize: "32px",
                  }}
                >
                  {beg.walletAddress.slice(0, 4)}...
                  {beg.walletAddress.slice(-4)}
                </p>
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "20000px",
                    background: "#FFD44F",
                  }}
                />
                <span
                  style={{
                    fontSize: "32px",
                    fontFamily: "Montserrat",
                    fontWeight: "medium",
                    color: "#5D3014",
                  }}
                >
                  {formatMessageTime(beg.timestamp)}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "flex-start",
                  gap: "16px",
                  width: "100%",
                }}
              >
                {/* Media Display */}
                {beg.imageUrl ? (
                  isVideoUrl(beg.imageUrl) ? (
                    <div
                      style={{
                        width: "160px",
                        height: "160px",
                        background: "rgba(0, 0, 0, 1)",
                        display: "flex",
                        flexShrink: 0,
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 4,
                      }}
                    >
                      <img
                        src="https://www.begsfun.xyz/assets/play-icon.svg"
                        alt="play video"
                        width="32"
                        height="32"
                        style={{ opacity: 0.8 }}
                      />
                    </div>
                  ) : (
                    <img
                      src={beg.imageUrl}
                      alt="message attachment"
                      style={{
                        width: "160px",
                        height: "160px",
                        flexShrink: 0,
                        objectFit: "cover",
                        borderRadius: "4px",
                      }}
                      width={80}
                      height={80}
                    />
                  )
                ) : null}
                <p
                  style={{
                    fontSize: "32px",
                    color: "#000000",
                    margin: 0,
                    width: "75%",
                  }}
                >
                  {truncateText(beg.text)}
                </p>
              </div>
              <div
                style={{
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "24px",
                    background: "#FFD44F",
                    borderRadius: "200px",
                    overflow: "hidden",
                    marginTop: "16px",
                    display: "flex",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(
                        100,
                        (Number(beg.fillAmount) / Number(beg.solAmount)) * 100
                      )}%`,
                      height: "100%",
                      background: "linear-gradient(to right, #009A49, #29F188)",
                      position: "absolute",
                      borderRadius: "200px",
                      top: 0,
                      left: 0,
                      display: "flex",
                    }}
                  />
                </div>
                {/* Donation Section */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    padding: "8px 12px",
                    borderRadius: "200px",
                    background: "#FFD44F",
                    border: "1px solid rgba(93, 48, 20, 0.4)",
                    marginTop: "16px",
                    width: "100%",
                  }}
                >
                  <img
                    src="https://www.begsfun.xyz/assets/solana-brown-icon.svg"
                    width="32"
                    height="32"
                    alt="solana"
                  />
                  <span
                    style={{
                      fontWeight: "bold",
                      color: "#5D3014",
                      fontSize: "24px",
                    }}
                  >
                    {formatSolAmount(beg.fillAmount)} /{" "}
                    {formatSolAmount(beg.solAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      ),
      {
        ...size,
        fonts: [
          {
            name: "Comic Sans MS",
            data: fontData,
            style: "normal",
            weight: 400,
          },
        ],
      }
    );
  } catch (e) {
    console.error("Error generating OpenGraph image:", e);
    return new ImageResponse(
      (
        <div
          style={{
            background: "#FFFBF2",
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            padding: "40px",
            fontFamily: "Comic Sans MS",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "24px",
            }}
          >
            <img
              src="https://begsfun.xyz/logo-icon.svg"
              width="64"
              height="64"
              alt="BegsFun"
            />
            <span
              style={{ fontSize: "32px", color: "#5D3014", fontWeight: "bold" }}
            >
              BegsFun
            </span>
          </div>
          <p style={{ fontSize: "24px", color: "#5D3014" }}>
            Error loading beg
          </p>
        </div>
      ),
      {
        ...size,
        fonts: [
          {
            name: "Comic Sans MS",
            data: fontData,
            style: "normal",
            weight: 400,
          },
        ],
      }
    );
  }
}
