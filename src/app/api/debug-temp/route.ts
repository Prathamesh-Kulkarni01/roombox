import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const db = await getAdminDb();
    const ownerId = "u2iuFhtepCRXCg0WmaXkg6CrIHu1";
    console.log(`[Debug Reset] Fetching owner doc for ${ownerId}...`);
    const docRef = db.collection('users').doc(ownerId);
    const snap = await docRef.get();
    
    if (!snap.exists) {
      return NextResponse.json({ success: false, error: "Owner not found" });
    }
    
    const data = snap.data();
    console.log("[Debug Reset] Current subscription data:", JSON.stringify(data?.subscription || {}));
    
    console.log("[Debug Reset] Resetting enterpriseProject configuration...");
    await docRef.update({
      "subscription.enterpriseProject": null
    });
    
    console.log("[Debug Reset] Reset complete.");
    return NextResponse.json({ success: true, message: "Successfully reset owner u2iuFhtepCRXCg0WmaXkg6CrIHu1 back to default database." });
  } catch (error: any) {
    console.error('[Debug Reset] Failed:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
