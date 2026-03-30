import { format } from 'date-fns';

function verifyPayload() {
    const name = "Prathamesh Kulkarni";
    const pgName = "Happy Home";
    const roomName = "Assigned Room";
    const rentAmount = "1";
    const dashboardUrl = "https://rentsutra-mcp.netlify.app/invite/abc";
    const startOfCycle = new Date("2026-03-30");
    const welcomeImage = "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80";

    const bodyValues = [
        { type: 'text', text: name }, // {{1}} - Tenant Name
        { type: 'text', text: pgName }, // {{2}} - PG Name
        { type: 'text', text: roomName }, // {{3}} - Room/Bed
        { type: 'text', text: `₹${rentAmount}` }, // {{4}} - Rent
        { type: 'text', text: dashboardUrl }, // {{5}} - Dashboard URL
        { type: 'text', text: format(startOfCycle, 'dd-MMM-yyyy') } // {{6}} - Joining Date
    ];

    const headerValues = [{ type: 'image', image: { link: welcomeImage } }];

    console.log("--- MOCKED WHATSAPP PAYLOAD ---");
    console.log("Template: new_guest_welcome_utility_2");
    console.log("Body Parameters (expected 6):", JSON.stringify(bodyValues, null, 2));
    console.log("Header Parameters (expected IMAGE):", JSON.stringify(headerValues, null, 2));

    if (bodyValues.length === 6 && headerValues[0].type === 'image') {
        console.log("\n✅ SUCCESS: Payload matches template requirements.");
    } else {
        console.log("\n❌ FAILURE: Payload mismatch.");
    }
}

verifyPayload();
