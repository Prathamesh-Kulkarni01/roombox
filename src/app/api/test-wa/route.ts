import { NextResponse } from 'next/server';
import { rejectIfProduction } from '@/lib/api/dev-only';
import { getAdminDb, selectOwnerDataAdminDb } from '@/lib/firebaseAdmin';
import { TenantService } from '@/services/tenantService';

export async function GET() {
  const blocked = rejectIfProduction();
  if (blocked) return blocked;

  try {
    const appDb = await getAdminDb();
    const usersSnap = await appDb.collection('users').where('subscription.enterpriseProject', '!=', null).limit(1).get();
    if (usersSnap.empty) return NextResponse.json({ error: "No sharded owner found" });
    
    const ownerId = usersSnap.docs[0].id;
    const db = await selectOwnerDataAdminDb(ownerId);
    
    const pgId = "test-pg-123";
    const tenantData = {
      ownerId,
      pgId,
      name: "Test Tenant",
      phone: "+919999999999",
      email: "test@example.com",
      rentAmount: 10000
    };
    
    const result = await TenantService.onboardTenant(
      db,
      appDb,
      tenantData,
      { userId: ownerId, name: 'Owner' }
    );
    
    return NextResponse.json({ success: true, result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
