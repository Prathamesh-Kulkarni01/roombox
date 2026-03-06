import { getAdminDb } from './src/lib/firebaseAdmin';
import { PropertyService } from './src/services/propertyService';
import { TenantService } from './src/services/tenantService';

async function testServices() {
    console.log("--- Testing Shared Services ---");
    try {
        const db = await getAdminDb();
        console.log("Connected to Firestore.");

        // We need a real ownerId from the DB to test. 
        // Let's find one.
        const usersSnap = await db.collection('users').where('role', '==', 'owner').limit(1).get();
        if (usersSnap.empty) {
            console.log("No owners found in DB.");
            return;
        }

        const ownerId = usersSnap.docs[0].id;
        const ownerName = usersSnap.docs[0].data().name;
        console.log(`Testing with Owner: ${ownerName} (${ownerId})`);

        console.log("\n1. Testing PropertyService.getBriefingStats...");
        const stats = await PropertyService.getBriefingStats(db, ownerId);
        console.log("Stats:", stats);

        console.log("\n2. Testing PropertyService.getBuildings...");
        const buildings = await PropertyService.getBuildings(db, ownerId);
        console.log(`Found ${buildings.length} buildings.`);
        buildings.forEach(b => console.log(` - ${b.name}: ${b.occupancy}/${b.totalBeds}`));

        console.log("\n3. Testing TenantService.getMonthlyRentSummary...");
        const summary = await TenantService.getMonthlyRentSummary(db, ownerId);
        console.log("Rent Summary:", summary);

        console.log("\n4. Testing TenantService.getActiveTenants...");
        const tenants = await TenantService.getActiveTenants(db, ownerId, 5);
        console.log(`Found ${tenants.length} active tenants.`);
        tenants.forEach(t => console.log(` - ${t.name} (PG: ${t.pgName}): Balance ₹${t.balance}`));

        console.log("\n✅ All services verified successfully!");
    } catch (error) {
        console.error("❌ Service test failed:", error);
    }
}

testServices();
