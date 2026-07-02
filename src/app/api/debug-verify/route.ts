import { NextRequest, NextResponse } from 'next/server';
import { rejectIfProduction } from '@/lib/api/dev-only';
import { resolveTenant } from '@/lib/tenantResolver';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const blocked = rejectIfProduction();
  if (blocked) return blocked;

  try {
    const { db } = await resolveTenant(request);
    const ownerId = "u2iuFhtepCRXCg0WmaXkg6CrIHu1";
    console.log(`[Debug Reset] Fetching owner doc for ${ownerId}...`);
    const docRef = db.collection('users').doc(ownerId);
    const snap = await docRef.get();
    
    if (!snap.exists) {
      return NextResponse.json({ success: false, error: "Owner not found" });
    }
    
    console.log("[Debug Reset] Resetting enterpriseProject configuration...");
    await docRef.update({
      "subscription.enterpriseProject": null
    });
    
    console.log("[Debug Reset] Reset complete.");
    return NextResponse.json({ success: true, message: "Successfully reset owner enterprise config (dev only)." });
  } catch (error: any) {
    console.error('[Debug Reset] Failed:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
