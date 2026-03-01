import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";

export async function POST(req: NextRequest) {
  try {
    const { fundAccountId } = await req.json();

    if (!fundAccountId) {
      return NextResponse.json(
        { error: "Missing fundAccountId" },
        { status: 400 }
      );
    }

    const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return NextResponse.json(
        { error: "Server misconfiguration: Razorpay keys missing" },
        { status: 500 }
      );
    }

    const razorpay = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET,
    });

    // Razorpay PATCH request to deactivate
    const response = await fetch(
      `https://api.razorpay.com/v1/fund_accounts/${fundAccountId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization:
            "Basic " +
            Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString(
              "base64"
            ),
        },
        body: JSON.stringify({ active: false }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: result.error?.description || "Failed to deactivate fund account" },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      razorpayResponse: result,
    });
  } catch (error: any) {
    console.error("Error in /api/payout/deactivate:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
