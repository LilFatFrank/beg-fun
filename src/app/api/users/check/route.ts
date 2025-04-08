import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("walletAddress");

    if (!walletAddress) {
      return NextResponse.json(
        { message: "Wallet address is required" },
        { status: 400 }
      );
    }

    // TODO: Replace with your actual database query
    // This is a mock implementation
    const userExists = await checkUserInDatabase(walletAddress);

    if (userExists) {
      return NextResponse.json({
        exists: true,
        userData: userExists,
      });
    } else {
      return NextResponse.json({
        exists: false,
      });
    }
  } catch (error) {
    console.error("Error checking user:", error);
    return NextResponse.json(
      { message: "Failed to check user existence" },
      { status: 500 }
    );
  }
}

// Mock function to check if user exists in database
// Replace this with your actual database query
async function checkUserInDatabase(walletAddress: string) {
  // This is where you would query your database
  // For now, we'll return a mock response
  
  // Simulate database delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Mock data - replace with actual database query
  const mockUsers = [
    {
      walletAddress: "mockWalletAddress1",
      username: "User1",
      createdAt: new Date().toISOString(),
    },
    {
      walletAddress: "mockWalletAddress2",
      username: "User2",
      createdAt: new Date().toISOString(),
    },
  ];
  
  return mockUsers.find(user => user.walletAddress === walletAddress) || null;
} 