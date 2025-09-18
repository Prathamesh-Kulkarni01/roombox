
import { NextResponse } from "next/server";
import axios from "axios";

interface PayoutRequestBody {
  account_number: string;
  fund_account_id: string;
  amountPaise: number;
  currency?: string;
  mode?: string;
  purpose?: string;
  notes?: Record<string, string>;
}

export async function POST(req: Request) {
  try {
    // ✅ Parse request body
    const {
      account_number,
      fund_account_id,
      amountPaise,
      currency = "INR",
      mode = "UPI",
      purpose = "payout",
      notes = {},
    }: PayoutRequestBody = await req.json();

    // ✅ Validate environment variables
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json(
        { error: "Razorpay keys are missing in environment variables." },
        { status: 500 }
      );
    }
    if (!process.env.RAZORPAY_ACCOUNT_NUMBER) {
        return NextResponse.json(
            { error: "Razorpay account number is not configured." },
            { status: 500 }
        );
    }

    // ✅ Prepare request
    const url = "https://api.razorpay.com/v1/payouts";

    const headers = {
      "Content-Type": "application/json",
    };

    const body = {
      account_number: process.env.RAZORPAY_ACCOUNT_NUMBER,
      fund_account_id,
      amount: amountPaise,
      currency,
      mode,
      purpose,
      queue_if_low_balance: true,
      notes,
    };

    // ✅ Call Razorpay Payouts API
    const res = await axios.post(url, body, {
      auth: {
        username: process.env.RAZORPAY_KEY_ID,
        password: process.env.RAZORPAY_KEY_SECRET,
      },
      headers,
    });

    return NextResponse.json(res.data, { status: 200 });
  } catch (error: any) {
    console.error("Error creating payout:", error.response?.data || error.message);
    return NextResponse.json(
      { error: error.response?.data || "Failed to create payout" },
      { status: error.response?.status || 500 }
    );
  }
}
