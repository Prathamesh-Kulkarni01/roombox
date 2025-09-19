
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    return NextResponse.json({ error: "Server misconfiguration: Razorpay keys missing." }, { status: 500 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body. Expected JSON." }, { status: 400 });
  }

  const vpaInput = body?.vpa?.toString()?.trim().toLowerCase();
  if (!vpaInput) {
    return NextResponse.json({ error: "vpa is required" }, { status: 400 });
  }

  // Basic client-side like validation to avoid unnecessary gateway calls
  const basicPattern = /^[\w.-]+@[\w.-]+$/;
  if (!basicPattern.test(vpaInput)) {
    return NextResponse.json({ success: false, valid: false, reason: "Invalid format. Expected something like name@okaxis" });
  }

  // In Razorpay Test Mode, they provide magic VPAs
  if (process.env.NODE_ENV !== 'production') {
    if (vpaInput === 'testsuccess@razorpay') {
      return NextResponse.json({ success: true, valid: true, provider: 'razorpay-test' });
    }
    if (vpaInput === 'testfailure@razorpay') {
      return NextResponse.json({ success: true, valid: false, provider: 'razorpay-test', reason: 'Forced failure VPA in test mode' });
    }
  }

  const authHeader = "Basic " + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");

  try {
    const resp = await fetch('https://api.razorpay.com/v1/payments/validate/vpa', {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ vpa: vpaInput }),
    });

    const data = await resp.json();

    if (!resp.ok) {
      // Razorpay responds 400 for invalid VPA
      const description = data?.error?.description || 'Validation failed';
      return NextResponse.json({ success: true, valid: false, reason: description }, { status: 200 });
    }

    // Example successful payload: { success: true, vpa: 'name@bank', customer_name: '...', ... }
    return NextResponse.json({ success: true, valid: true, details: data });
  } catch (error: any) {
    console.error('VPA validation error:', error);
    return NextResponse.json({ error: 'Could not validate VPA at the moment.' }, { status: 500 });
  }
} 
