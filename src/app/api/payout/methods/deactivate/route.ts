

import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";

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

  const razorpay = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
  });

  try {
    const response = await razorpay.fundAccounts.update(fundAccountId, { active: false });
    return NextResponse.json({ success: true, deactivatedAccount: response });
  } catch (error: any) {
    console.error("Error deactivating Razorpay fund account:", error);
    return NextResponse.json({ success: false, error: error.error?.description || "Failed to deactivate account on Razorpay." }, { status: 500 });
  }
}
