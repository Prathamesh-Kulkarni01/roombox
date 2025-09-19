
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: NextRequest) {
  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    return NextResponse.json({ error: "Server misconfiguration: Razorpay keys missing." }, { status: 500 });
  }

  let body;
  try {
    body = await req.json();
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  
  const { fundAccountId } = body;
  if (!fundAccountId) {
    return NextResponse.json({ error: "fundAccountId is required" }, { status: 400 });
  }

  try {
    const response = await axios.patch(
      `https://api.razorpay.com/v1/fund_accounts/${fundAccountId}`,
      { active: false },
      {
        auth: {
          username: RAZORPAY_KEY_ID,
          password: RAZORPAY_KEY_SECRET,
        },
      }
    );
    return NextResponse.json({ success: true, deactivatedAccount: response.data });
  } catch (error: any) {
    console.error("Error deactivating Razorpay fund account:", error.response?.data);
    return NextResponse.json(
        { success: false, error: error.response?.data?.error?.description || "Failed to deactivate account on Razorpay." }, 
        { status: error.response?.status || 500 }
    );
  }
}
