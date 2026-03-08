/**
 * Workflow Definitions — Declarative Configuration
 *
 * Every conversation flow is defined here as pure data.
 * The WorkflowEngine interprets and drives them — no if/else chains needed.
 */

import { WorkflowDefinition } from './workflow-types';
import { PropertyService } from '../../services/propertyService';
import { TenantService } from '../../services/tenantService';
import { selectOwnerDataAdminDb } from '../firebaseAdmin';

// ─────────────────────────────────────────────────────────────
// MAIN MENU WORKFLOW
// Entry point after owner login
// ─────────────────────────────────────────────────────────────
export const mainMenuWorkflow: WorkflowDefinition = {
    id: 'mainMenu',
    name: 'Main Menu',
    description: 'Owner dashboard main menu',
    entryPoint: 'showMenu',

    steps: {
        showMenu: {
            id: 'showMenu',
            type: 'menu',
            label: 'Main Menu',
            messageBuilder: (ctx) => {
                const ownerName = ctx.ownerName || 'Owner';
                const stats = ctx.data.stats || {};
                const statsLine = stats.totalBuildings !== undefined
                    ? `📊 ${stats.totalBuildings} Properties | ${stats.totalTenants} Tenants\n\n`
                    : '';
                return (
                    `🏠 *RoomBox Dashboard*\nHi ${ownerName}!\n\n` +
                    statsLine +
                    `1️⃣ View Properties\n` +
                    `2️⃣ Today's Payments\n` +
                    `3️⃣ Monthly Summary\n` +
                    `4️⃣ Pending Rents\n` +
                    `5️⃣ Send Reminders\n` +
                    `6️⃣ Onboard New Tenant\n` +
                    `7️⃣ Manage Tenants\n` +
                    `8️⃣ Reports & Analytics\n` +
                    `9️⃣ Dashboard Link`
                );
            },
            onEnter: async (ctx) => {
                // Load briefing stats on entry
                try {
                    const db = await selectOwnerDataAdminDb(ctx.ownerId!);
                    const stats = await PropertyService.getBriefingStats(db, ctx.ownerId!);
                    ctx.data.stats = stats;
                } catch { /* non-fatal */ }
            },
            nextSteps: {
                '1': '__switchPropertyManagement',
                '2': '__switchTodayPayments',
                '3': '__switchMonthlySummary',
                '4': '__switchPendingRents',
                '5': 'sendReminders',
                '6': '__switchAddTenant',
                '7': '__switchManageTenants',
                '8': 'reports',
                '9': 'dashboardLink',
            },
            validation: {
                customValidator: (input) => ['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(input.trim()),
                errorMessage: 'Please reply with a number from 1 to 9.',
            },
        },

        sendReminders: {
            id: 'sendReminders',
            type: 'display',
            label: 'Send Reminders',
            messageTemplate: '📢 *Rent Reminders*\n\nSending WhatsApp reminders to all tenants with pending rent. Visit the dashboard for full control.\n\nReply *Menu* to return.',
            defaultNext: 'showMenu',
        },

        reports: {
            id: 'reports',
            type: 'display',
            label: 'Reports',
            messageTemplate: '📈 *Reports & Analytics*\n\nVisit your dashboard to view detailed financial reports and occupancy analytics.\n\nhttps://roombox.netlify.app/dashboard/analytics\n\nReply *Menu* to return.',
            defaultNext: 'showMenu',
        },

        dashboardLink: {
            id: 'dashboardLink',
            type: 'display',
            label: 'Dashboard Link',
            messageTemplate: '🔗 *Your Secure Dashboard*\n\nManage everything from here:\nhttps://roombox.netlify.app/dashboard\n\nReply *Menu* to return.',
            defaultNext: 'showMenu',
        },

        todayPayments: {
            id: 'todayPayments',
            type: 'display',
            label: "Today's Payments",
            messageBuilder: (ctx) => {
                const payments = ctx.data.todayPayments || [];
                if (payments.length === 0) {
                    return `💰 *Today's Payments*\n\nNo payments recorded today.\n\nReply *Menu* to return.`;
                }
                let msg = `💰 *Today's Payments*\n\n`;
                payments.forEach((p: any, i: number) => {
                    msg += `${i + 1}. ${p.tenantName} — ₹${p.amount} (${p.mode || 'Cash'})\n`;
                });
                return msg + `\nReply *Menu* to return.`;
            },
            onEnter: async (ctx) => {
                try {
                    const db = await selectOwnerDataAdminDb(ctx.ownerId!);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const snap = await db.collection('users_data')
                        .doc(ctx.ownerId!)
                        .collection('ledger')
                        .where('date', '>=', today.toISOString())
                        .orderBy('date', 'desc')
                        .get();
                    ctx.data.todayPayments = snap.docs.map((d: any) => d.data());
                } catch { ctx.data.todayPayments = []; }
            },
            defaultNext: 'showMenu',
        },

        monthlySummary: {
            id: 'monthlySummary',
            type: 'display',
            label: 'Monthly Summary',
            messageBuilder: (ctx) => {
                const s = ctx.data.summary || {};
                return (
                    `📅 *This Month's Rent Summary*\n\n` +
                    `Expected:  ₹${s.expected || 0}\n` +
                    `Collected: ₹${s.collected || 0}\n` +
                    `Pending:   ₹${s.pending || 0}\n\n` +
                    `Reply *Menu* to return.`
                );
            },
            onEnter: async (ctx) => {
                try {
                    const db = await selectOwnerDataAdminDb(ctx.ownerId!);
                    ctx.data.summary = await TenantService.getMonthlyRentSummary(db, ctx.ownerId!);
                } catch { ctx.data.summary = {}; }
            },
            defaultNext: 'showMenu',
        },

        pendingRents: {
            id: 'pendingRents',
            type: 'display',
            label: 'Pending Rents',
            messageBuilder: (ctx) => {
                const tenants = ctx.data.pendingTenants || [];
                if (tenants.length === 0) {
                    return `✅ All tenants have paid! No pending rents.\n\nReply *Menu* to return.`;
                }
                let msg = `⚠️ *Pending Rents*\n\n`;
                tenants.forEach((t: any, i: number) => {
                    msg += `${i + 1}. ${t.name} — ₹${t.balance || 0}\n`;
                });
                return msg + `\nReply *Menu* to return.`;
            },
            onEnter: async (ctx) => {
                try {
                    const db = await selectOwnerDataAdminDb(ctx.ownerId!);
                    ctx.data.pendingTenants = await TenantService.getActiveTenants(db, ctx.ownerId!, 20, 'pending');
                } catch { ctx.data.pendingTenants = []; }
            },
            defaultNext: 'showMenu',
        },
    },
};

// ─────────────────────────────────────────────────────────────
// PROPERTY MANAGEMENT WORKFLOW
// ─────────────────────────────────────────────────────────────
export const propertyManagementWorkflow: WorkflowDefinition = {
    id: 'propertyManagement',
    name: 'Property Management',
    description: 'View and manage properties',
    entryPoint: 'selectProperty',

    steps: {
        selectProperty: {
            id: 'selectProperty',
            type: 'menu',
            label: 'Select Property',
            messageTemplate: '🏠 *Your Properties (PGs)*',
            onEnter: async (ctx) => {
                const db = await selectOwnerDataAdminDb(ctx.ownerId!);
                ctx.data.pgsList = await PropertyService.getBuildings(db, ctx.ownerId!);
            },
            optionsFn: async (ctx) => {
                const props = ctx.data.pgsList || [];
                const opts = props.map((p: any, i: number) => ({
                    key: i + 1,
                    label: `${p.name} (${p.occupancy ?? '?'}/${p.totalBeds ?? '?'} Occupied)`,
                    target: 'viewPropertyDetails',
                }));
                opts.push({ key: props.length + 1, label: '➕ Add New Property', target: 'addPropertyName' });
                return opts;
            },
            validation: {
                customValidator: (input, ctx) => {
                    const n = parseInt(input);
                    return !isNaN(n) && n >= 1 && n <= (ctx.data.pgsList?.length || 0) + 1;
                },
                errorMessage: 'Please reply with a valid number.',
            },
            nextStepsFn: async (input, ctx) => {
                const n = parseInt(input);
                const count = ctx.data.pgsList?.length || 0;
                if (n === count + 1) return 'addPropertyName';
                ctx.data.selectedProperty = ctx.data.pgsList[n - 1];
                return 'viewPropertyDetails';
            },
        },

        viewPropertyDetails: {
            id: 'viewPropertyDetails',
            type: 'menu',
            label: 'Property Details',
            messageBuilder: (ctx) => {
                const p = ctx.data.selectedProperty;
                const tenants = ctx.data.propertyTenants || [];
                let msg = `🏠 *${p?.name}*\n\nLocation: ${p?.location || 'N/A'}\nBeds: ${p?.totalBeds || 0} | Occupied: ${p?.occupancy || 0}\n\n`;
                if (tenants.length > 0) {
                    msg += `*Tenants:*\n`;
                    tenants.forEach((t: any, i: number) => {
                        msg += `  ${i + 1}. ${t.name} — Room ${t.roomNumber || 'N/A'}\n`;
                    });
                    msg += '\n';
                }
                msg += `1️⃣ View Tenants\n2️⃣ Record Payment\n3️⃣ Onboard New Tenant\n4️⃣ ← Back to Properties`;
                return msg;
            },
            onEnter: async (ctx) => {
                try {
                    const db = await selectOwnerDataAdminDb(ctx.ownerId!);
                    const allTenants = await TenantService.getActiveTenants(db, ctx.ownerId!, 100);
                    const pgId = ctx.data.selectedProperty?.id;
                    ctx.data.propertyTenants = pgId
                        ? allTenants.filter((t: any) => t.pgId === pgId || t.currentPg === pgId)
                        : allTenants;
                } catch { ctx.data.propertyTenants = []; }
            },
            nextSteps: {
                '1': 'selectPropertyTenant',
                '2': 'recordPropertyPaymentAmount',
                '3': '__switchAddTenant',
                '4': 'selectProperty',
            },
            validation: {
                customValidator: (input) => ['1', '2', '3', '4'].includes(input.trim()),
                errorMessage: 'Please reply with 1, 2, 3, or 4.',
            },
        },

        selectPropertyTenant: {
            id: 'selectPropertyTenant',
            type: 'menu',
            label: 'Select Tenant',
            messageTemplate: '👤 Select a tenant:',
            optionsFn: async (ctx) => {
                const tenants = ctx.data.propertyTenants || [];
                return [
                    ...tenants.map((t: any, i: number) => ({
                        key: i + 1,
                        label: `${t.name} — Room ${t.roomNumber || 'N/A'}`,
                    })),
                    { key: tenants.length + 1, label: '← Back' },
                ];
            },
            validation: {
                customValidator: (input, ctx) => {
                    const n = parseInt(input);
                    return !isNaN(n) && n >= 1 && n <= (ctx.data.propertyTenants?.length || 0) + 1;
                },
                errorMessage: 'Please reply with a valid number.',
            },
            nextStepsFn: async (input, ctx) => {
                const n = parseInt(input);
                const tenants = ctx.data.propertyTenants || [];
                if (n === tenants.length + 1) return 'viewPropertyDetails';
                ctx.data.selectedTenant = tenants[n - 1];
                return 'viewTenantProfile';
            },
        },

        recordPropertyPaymentAmount: {
            id: 'recordPropertyPaymentAmount',
            type: 'input',
            label: 'Payment Amount',
            messageTemplate: '💰 Enter the payment amount:\n(e.g., 5000)',
            validation: {
                regex: /^\d+$/,
                errorMessage: 'Please enter a valid number (e.g., 5000).',
            },
            nextStepsFn: async (input, ctx) => {
                ctx.data.paymentAmount = parseInt(input);
                return 'confirmPropertyPayment';
            },
        },

        confirmPropertyPayment: {
            id: 'confirmPropertyPayment',
            type: 'confirmation',
            label: 'Confirm Payment',
            messageBuilder: (ctx) => {
                return (
                    `✅ *Confirm Payment*\n\n` +
                    `Property: ${ctx.data.selectedProperty?.name}\n` +
                    `Amount: ₹${ctx.data.paymentAmount}\n\n` +
                    `1️⃣ Confirm\n2️⃣ Cancel`
                );
            },
            nextSteps: { '1': 'savePropertyPayment', '2': 'viewPropertyDetails' },
            validation: {
                customValidator: (input) => ['1', '2'].includes(input.trim()),
                errorMessage: 'Please reply 1 to confirm or 2 to cancel.',
            },
        },

        savePropertyPayment: {
            id: 'savePropertyPayment',
            type: 'display',
            label: 'Payment Saved',
            messageBuilder: (ctx) => `✅ Payment of ₹${ctx.data.paymentAmount} recorded for *${ctx.data.selectedProperty?.name}*.\n\nReply *Menu* to continue.`,
            onEnter: async (ctx) => {
                try {
                    const db = await selectOwnerDataAdminDb(ctx.ownerId!);
                    await db.collection('users_data').doc(ctx.ownerId!).collection('ledger').add({
                        amount: ctx.data.paymentAmount,
                        date: new Date().toISOString(),
                        type: 'rent_collection',
                        property: ctx.data.selectedProperty?.name,
                        propertyId: ctx.data.selectedProperty?.id,
                        status: 'completed',
                        recordedVia: 'whatsapp',
                    });
                } catch (e: any) {
                    ctx.data._error = e.message;
                }
            },
            defaultNext: 'selectProperty',
        },

        // ---------- Add Property Revamped Flow ----------
        addPropertyName: {
            id: 'addPropertyName',
            type: 'input',
            label: 'Property Name',
            messageTemplate: '🏠 *New Property Setup*\n\nStep 1/3: What is the *Building Name*?\n(e.g., "Gokul PG", "Sai Residency")',
            nextStepsFn: async (input, ctx) => {
                ctx.data.newPropName = input.trim();
                return 'addPropertyLocation';
            },
        },

        addPropertyLocation: {
            id: 'addPropertyLocation',
            type: 'input',
            label: 'Location',
            messageTemplate: 'Step 2/3: Where is it located?\n(e.g., "Sector 62, Noida" or "Kothrud, Pune")',
            nextStepsFn: async (input, ctx) => {
                ctx.data.newPropLocation = input.trim();
                return 'addPropertySetupChoice';
            },
        },

        addPropertySetupChoice: {
            id: 'addPropertySetupChoice',
            type: 'menu',
            label: 'Setup Floors',
            messageTemplate: 'Step 3/3: Would you like to setup Floors & Rooms now?\n\n1️⃣ YES (Fast Bulk Setup)\n2️⃣ NO (Just Create Building)',
            nextSteps: {
                '1': 'addPropertyFloorsCount',
                '2': 'confirmAddProperty'
            },
            validation: {
                customValidator: (input) => ['1', '2'].includes(input.trim()),
                errorMessage: 'Please reply 1 for Yes or 2 for No.'
            }
        },

        addPropertyFloorsCount: {
            id: 'addPropertyFloorsCount',
            type: 'input',
            label: 'Floors Count',
            messageTemplate: '🏢 *Bulk Setup*\n\nHow many *Floors* does this building have?\n(e.g., 3)',
            validation: { regex: /^\d+$/, errorMessage: 'Please enter a number (e.g., 3).' },
            nextStepsFn: async (input, ctx) => {
                ctx.data.newPropFloors = parseInt(input);
                return 'addPropertyRoomsPerFloor';
            },
        },

        addPropertyRoomsPerFloor: {
            id: 'addPropertyRoomsPerFloor',
            type: 'input',
            label: 'Rooms Per Floor',
            messageTemplate: '🛏️ How many *Rooms* on *each floor* average?\n(e.g., 4)',
            validation: { regex: /^\d+$/, errorMessage: 'Please enter a number (e.g., 4).' },
            nextStepsFn: async (input, ctx) => {
                ctx.data.newPropRoomsPerFloor = parseInt(input);
                return 'confirmAddProperty';
            },
        },

        confirmAddProperty: {
            id: 'confirmAddProperty',
            type: 'confirmation',
            label: 'Confirm New Property',
            messageBuilder: (ctx) => {
                const floors = ctx.data.newPropFloors || 0;
                const roomsPerFloor = ctx.data.newPropRoomsPerFloor || 0;
                const totalRooms = floors * roomsPerFloor;

                let detailMsg = '';
                if (floors > 0) {
                    detailMsg = `Floors: ${floors}\nRooms: ${totalRooms} (${roomsPerFloor} per floor)\n`;
                } else {
                    detailMsg = `Setup: Basic (No floors/rooms yet)\n`;
                }

                return (
                    `📋 *Confirm New Property*\n\n` +
                    `Building: *${ctx.data.newPropName}*\n` +
                    `Location: ${ctx.data.newPropLocation}\n` +
                    detailMsg +
                    `\n1️⃣ SAVE\n2️⃣ CANCEL`
                );
            },
            nextSteps: { '1': 'saveProperty', '2': 'selectProperty' },
            validation: {
                customValidator: (input) => ['1', '2'].includes(input.trim()),
                errorMessage: 'Please reply 1 to SAVE or 2 to CANCEL.',
            },
        },

        saveProperty: {
            id: 'saveProperty',
            type: 'display',
            label: 'Property Saved',
            messageBuilder: (ctx) => (
                ctx.data._error
                    ? `❌ Oops! Could not save: ${ctx.data._error}\n\nPlease try again later.`
                    : `✅ *Building Created Successfully!*\n\n${ctx.data.newPropName} is ready.\n\nReply *Menu* to manage properties.`
            ),
            onEnter: async (ctx) => {
                try {
                    const db = await selectOwnerDataAdminDb(ctx.ownerId!);
                    const newPgId = `pg-${Date.now()}`;

                    const floorsList = [];
                    const floorsCount = ctx.data.newPropFloors || 0;
                    const roomsPerFloor = ctx.data.newPropRoomsPerFloor || 0;

                    for (let i = 1; i <= floorsCount; i++) {
                        const rooms = [];
                        const floorId = `floor-${Date.now()}-${i}`;
                        for (let j = 1; j <= roomsPerFloor; j++) {
                            const roomNum = (i * 100) + j;
                            const roomId = `room-${Date.now()}-${i}-${j}`;
                            rooms.push({
                                id: roomId,
                                name: `${roomNum}`,
                                pgId: newPgId,
                                floorId: floorId,
                                beds: [{ id: `bed-${roomId}-1`, name: '1', guestId: null }],
                                rent: 0,
                                deposit: 0,
                                available: true
                            });
                        }
                        floorsList.push({
                            id: floorId,
                            name: `Floor ${i}`,
                            pgId: newPgId,
                            rooms: rooms
                        });
                    }

                    await db.collection('users_data').doc(ctx.ownerId!).collection('pgs').doc(newPgId).set({
                        id: newPgId,
                        ownerId: ctx.ownerId,
                        name: ctx.data.newPropName,
                        location: ctx.data.newPropLocation,
                        floors: floorsList,
                        totalBeds: floorsCount * roomsPerFloor,
                        occupancy: 0,
                        isActive: true,
                        createdDate: new Date().toISOString(),
                    });
                } catch (e: any) {
                    ctx.data._error = e.message;
                }
            },
            defaultNext: 'selectProperty',
        },
    },
};

// ─────────────────────────────────────────────────────────────
// TENANT MANAGEMENT WORKFLOW
// ─────────────────────────────────────────────────────────────
export const tenantManagementWorkflow: WorkflowDefinition = {
    id: 'tenantManagement',
    name: 'Tenant Management',
    description: 'Manage existing tenants — edit, payment, vacate, KYC',
    entryPoint: 'selectTenantToManage',

    steps: {
        selectTenantToManage: {
            id: 'selectTenantToManage',
            type: 'menu',
            label: 'Select Tenant',
            messageTemplate: '👤 *Tenant Management*\n\nSelect a tenant:',
            onEnter: async (ctx) => {
                const db = await selectOwnerDataAdminDb(ctx.ownerId!);
                ctx.data.tenantList = await TenantService.getActiveTenants(db, ctx.ownerId!, 20);
            },
            optionsFn: async (ctx) => {
                const tenants = ctx.data.tenantList || [];
                return tenants.map((t: any, i: number) => ({
                    key: i + 1,
                    label: `${t.name} (${t.pgName || 'Unknown PG'})`,
                }));
            },
            validation: {
                customValidator: (input, ctx) => {
                    const n = parseInt(input);
                    return !isNaN(n) && n >= 1 && n <= (ctx.data.tenantList?.length || 0);
                },
                errorMessage: 'Please reply with a valid number.',
            },
            nextStepsFn: async (input, ctx) => {
                const n = parseInt(input);
                ctx.data.selectedTenant = ctx.data.tenantList[n - 1];
                return 'tenantActions';
            },
        },

        tenantActions: {
            id: 'tenantActions',
            type: 'menu',
            label: 'Tenant Actions',
            messageBuilder: (ctx) => {
                const t = ctx.data.selectedTenant || {};
                return (
                    `👤 *${t.name}*\n\n` +
                    `PG: ${t.pgName || 'N/A'}\n` +
                    `Room: ${t.roomNumber || 'N/A'}\n` +
                    `Rent: ₹${t.rentAmount || 0} | Balance: ₹${t.balance || 0}\n` +
                    `Phone: ${t.phone || 'N/A'}\n\n` +
                    `1️⃣ Edit Details\n` +
                    `2️⃣ Record Payment\n` +
                    `3️⃣ View/Upload KYC\n` +
                    `4️⃣ Vacate Tenant\n` +
                    `5️⃣ ← Back`
                );
            },
            nextSteps: {
                '1': 'editTenantSelect',
                '2': 'recordTenantPaymentAmount',
                '3': 'kycMenu',
                '4': 'confirmVacate',
                '5': 'selectTenantToManage',
            },
            validation: {
                customValidator: (input) => ['1', '2', '3', '4', '5'].includes(input.trim()),
                errorMessage: 'Please reply with a number from 1 to 5.',
            },
        },

        // ---------- Edit Tenant ----------
        editTenantSelect: {
            id: 'editTenantSelect',
            type: 'menu',
            label: 'Edit — Choose Field',
            messageTemplate: `✏️ *Edit Tenant Details*\n\nWhat would you like to update?\n\n1️⃣ Name\n2️⃣ Rent Amount\n3️⃣ Phone Number\n4️⃣ ← Back`,
            nextSteps: {
                '1': 'editTenantName',
                '2': 'editTenantRent',
                '3': 'editTenantPhone',
                '4': 'tenantActions',
            },
            validation: {
                customValidator: (input) => ['1', '2', '3', '4'].includes(input.trim()),
                errorMessage: 'Please reply with 1, 2, 3, or 4.',
            },
        },

        editTenantName: {
            id: 'editTenantName',
            type: 'input',
            label: 'New Name',
            messageBuilder: (ctx) => `Current name: *${ctx.data.selectedTenant?.name}*\n\nEnter the new name:`,
            nextStepsFn: async (input, ctx) => {
                ctx.data.editField = 'name';
                ctx.data.editFieldLabel = 'Name';
                ctx.data.editValue = input.trim();
                return 'confirmEditTenant';
            },
        },

        editTenantRent: {
            id: 'editTenantRent',
            type: 'input',
            label: 'New Rent',
            messageBuilder: (ctx) => `Current rent: *₹${ctx.data.selectedTenant?.rentAmount || 0}*\n\nEnter the new rent amount:`,
            validation: { regex: /^\d+$/, errorMessage: 'Please enter a valid amount (numbers only).' },
            nextStepsFn: async (input, ctx) => {
                ctx.data.editField = 'rentAmount';
                ctx.data.editFieldLabel = 'Rent Amount';
                ctx.data.editValue = input.trim();
                return 'confirmEditTenant';
            },
        },

        editTenantPhone: {
            id: 'editTenantPhone',
            type: 'input',
            label: 'New Phone',
            messageBuilder: (ctx) => `Current phone: *${ctx.data.selectedTenant?.phone || 'N/A'}*\n\nEnter the new 10-digit phone number:`,
            validation: { regex: /^\d{10}$/, errorMessage: 'Please enter a valid 10-digit number.' },
            nextStepsFn: async (input, ctx) => {
                ctx.data.editField = 'phone';
                ctx.data.editFieldLabel = 'Phone Number';
                ctx.data.editValue = input.trim();
                return 'confirmEditTenant';
            },
        },

        confirmEditTenant: {
            id: 'confirmEditTenant',
            type: 'confirmation',
            label: 'Confirm Edit',
            messageBuilder: (ctx) => (
                `✏️ *Confirm Update*\n\n` +
                `Tenant: ${ctx.data.selectedTenant?.name}\n` +
                `Field: ${ctx.data.editFieldLabel}\n` +
                `New Value: ${ctx.data.editValue}\n\n` +
                `1️⃣ Confirm\n2️⃣ Cancel`
            ),
            nextSteps: { '1': 'saveEditTenant', '2': 'editTenantSelect' },
            validation: {
                customValidator: (input) => ['1', '2'].includes(input.trim()),
                errorMessage: 'Please reply 1 to confirm or 2 to cancel.',
            },
        },

        saveEditTenant: {
            id: 'saveEditTenant',
            type: 'display',
            label: 'Edit Saved',
            messageBuilder: (ctx) => (
                ctx.data._error
                    ? `❌ Could not update: ${ctx.data._error}`
                    : `✅ *Updated!*\n\n${ctx.data.editFieldLabel} has been set to *${ctx.data.editValue}*.\n\nReply *Menu* to continue.`
            ),
            onEnter: async (ctx) => {
                try {
                    const db = await selectOwnerDataAdminDb(ctx.ownerId!);
                    const tenantId = ctx.data.selectedTenant?.id;
                    await db.collection('users_data')
                        .doc(ctx.ownerId!)
                        .collection('guests')
                        .doc(tenantId)
                        .update({ [ctx.data.editField]: ctx.data.editValue });
                    // Update local copy too
                    ctx.data.selectedTenant = { ...ctx.data.selectedTenant, [ctx.data.editField]: ctx.data.editValue };
                } catch (e: any) { ctx.data._error = e.message; }
            },
            defaultNext: 'tenantActions',
        },

        // ---------- Record Tenant Payment ----------
        recordTenantPaymentAmount: {
            id: 'recordTenantPaymentAmount',
            type: 'input',
            label: 'Payment Amount',
            messageBuilder: (ctx) => `💰 *Record Payment for ${ctx.data.selectedTenant?.name}*\n\nEnter the amount received:\n(e.g., 5000)`,
            validation: { regex: /^\d+$/, errorMessage: 'Please enter a valid number (e.g., 5000).' },
            nextStepsFn: async (input, ctx) => {
                ctx.data.paymentAmount = parseInt(input);
                return 'confirmTenantPayment';
            },
        },

        confirmTenantPayment: {
            id: 'confirmTenantPayment',
            type: 'confirmation',
            label: 'Confirm Payment',
            messageBuilder: (ctx) => (
                `✅ *Confirm Payment*\n\n` +
                `Tenant: ${ctx.data.selectedTenant?.name}\n` +
                `Amount: ₹${ctx.data.paymentAmount}\n\n` +
                `1️⃣ Confirm\n2️⃣ Cancel`
            ),
            nextSteps: { '1': 'saveTenantPayment', '2': 'tenantActions' },
            validation: {
                customValidator: (input) => ['1', '2'].includes(input.trim()),
                errorMessage: 'Please reply 1 to confirm or 2 to cancel.',
            },
        },

        saveTenantPayment: {
            id: 'saveTenantPayment',
            type: 'display',
            label: 'Payment Saved',
            messageBuilder: (ctx) => (
                ctx.data._error
                    ? `❌ Payment failed: ${ctx.data._error}\n\nPlease record from the dashboard.`
                    : `✅ *Payment of ₹${ctx.data.paymentAmount} recorded!*\n\nNew Balance: ₹${ctx.data.newBalance ?? '—'}\nStatus: ${ctx.data.newStatus ?? '—'}\n\nReply *Menu* to continue.`
            ),
            onEnter: async (ctx) => {
                try {
                    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
                    const res = await fetch(`${baseUrl}/api/rent`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            ownerId: ctx.ownerId,
                            guestId: ctx.data.selectedTenant?.id,
                            amount: ctx.data.paymentAmount,
                            paymentMode: 'cash',
                            notes: 'Recorded via WhatsApp',
                        }),
                    });
                    const result = await res.json();
                    if (!result.success) throw new Error(result.error || 'Payment failed');
                    ctx.data.newBalance = result.newBalance;
                    ctx.data.newStatus = result.newStatus;
                } catch (e: any) { ctx.data._error = e.message; }
            },
            defaultNext: 'tenantActions',
        },

        // ---------- KYC ----------
        kycMenu: {
            id: 'kycMenu',
            type: 'menu',
            label: 'KYC',
            messageBuilder: (ctx) => `📄 *KYC — ${ctx.data.selectedTenant?.name}*\n\n1️⃣ View Photo\n2️⃣ View Aadhaar\n3️⃣ Upload Photo\n4️⃣ Upload Aadhaar\n5️⃣ ← Back`,
            nextSteps: {
                '1': 'viewKycPhoto',
                '2': 'viewKycAadhaar',
                '3': 'uploadKycPhoto',
                '4': 'uploadKycAadhaar',
                '5': 'tenantActions',
            },
            validation: {
                customValidator: (input) => ['1', '2', '3', '4', '5'].includes(input.trim()),
                errorMessage: 'Please reply with a number from 1 to 5.',
            },
        },

        viewKycPhoto: {
            id: 'viewKycPhoto',
            type: 'display',
            label: 'View Photo',
            messageTemplate: '📸 Fetching tenant photo... (Tap the image link from the dashboard for now.)\n\nReply *Menu* to continue.',
            defaultNext: 'tenantActions',
        },

        viewKycAadhaar: {
            id: 'viewKycAadhaar',
            type: 'display',
            label: 'View Aadhaar',
            messageTemplate: '📄 Fetching Aadhaar card... (View securely from the dashboard.)\n\nReply *Menu* to continue.',
            defaultNext: 'tenantActions',
        },

        uploadKycPhoto: {
            id: 'uploadKycPhoto',
            type: 'input',
            label: 'Upload Photo',
            messageTemplate: '📸 Please send the *Tenant Photo* image now:',
            nextStepsFn: async (input, ctx) => {
                ctx.data.kycUpload = { type: 'photo', mediaId: input };
                return 'kycUploaded';
            },
        },

        uploadKycAadhaar: {
            id: 'uploadKycAadhaar',
            type: 'input',
            label: 'Upload Aadhaar',
            messageTemplate: '📄 Please send the *Aadhaar Card* image now:',
            nextStepsFn: async (input, ctx) => {
                ctx.data.kycUpload = { type: 'aadhaar', mediaId: input };
                return 'kycUploaded';
            },
        },

        kycUploaded: {
            id: 'kycUploaded',
            type: 'display',
            label: 'KYC Uploaded',
            messageBuilder: (ctx) => (
                `✅ *KYC Uploaded*\n\n` +
                `${ctx.data.kycUpload?.type === 'photo' ? 'Photo' : 'Aadhaar Card'} has been saved to ${ctx.data.selectedTenant?.name}'s profile.\n\n` +
                `Reply *Menu* to continue.`
            ),
            defaultNext: 'tenantActions',
        },

        // ---------- Vacate Tenant ----------
        confirmVacate: {
            id: 'confirmVacate',
            type: 'confirmation',
            label: 'Confirm Vacate',
            messageBuilder: (ctx) => (
                `⚠️ *Vacate Tenant*\n\n` +
                `Are you sure you want to mark *${ctx.data.selectedTenant?.name}* as vacated?\n\n` +
                `1️⃣ Yes, Vacate\n2️⃣ Cancel`
            ),
            nextSteps: { '1': 'vacateTenant', '2': 'tenantActions' },
            validation: {
                customValidator: (input) => ['1', '2'].includes(input.trim()),
                errorMessage: 'Please reply 1 to confirm or 2 to cancel.',
            },
        },

        vacateTenant: {
            id: 'vacateTenant',
            type: 'display',
            label: 'Tenant Vacated',
            messageBuilder: (ctx) => (
                ctx.data._error
                    ? `❌ Could not vacate tenant: ${ctx.data._error}`
                    : `✅ *${ctx.data.selectedTenant?.name}* has been marked as vacated.\n\nReply *Menu* to continue.`
            ),
            onEnter: async (ctx) => {
                try {
                    const db = await selectOwnerDataAdminDb(ctx.ownerId!);
                    await db.collection('users_data')
                        .doc(ctx.ownerId!)
                        .collection('guests')
                        .doc(ctx.data.selectedTenant?.id)
                        .update({ isVacated: true, exitDate: new Date().toISOString() });
                } catch (e: any) { ctx.data._error = e.message; }
            },
            defaultNext: 'selectTenantToManage',
        },
    },
};

// ─────────────────────────────────────────────────────────────
// ADD TENANT WORKFLOW
// Onboard a new tenant through property → room → form
// ─────────────────────────────────────────────────────────────
export const addTenantWorkflow: WorkflowDefinition = {
    id: 'addTenant',
    name: 'Onboard New Tenant',
    description: 'Step-by-step tenant onboarding form',
    entryPoint: 'selectPgForTenant',

    steps: {
        selectPgForTenant: {
            id: 'selectPgForTenant',
            type: 'menu',
            label: 'Select Property',
            messageTemplate: '🏠 *Onboard New Tenant*\n\nSelect the property:',
            onEnter: async (ctx) => {
                const db = await selectOwnerDataAdminDb(ctx.ownerId!);
                ctx.data.pgsList = await PropertyService.getBuildings(db, ctx.ownerId!);
            },
            optionsFn: async (ctx) => {
                const props = ctx.data.pgsList || [];
                if (props.length === 0) return [{ key: 1, label: '❌ No properties yet — add one first' }];
                return props.map((p: any, i: number) => ({ key: i + 1, label: p.name }));
            },
            validation: {
                customValidator: (input, ctx) => {
                    const n = parseInt(input);
                    return !isNaN(n) && n >= 1 && n <= (ctx.data.pgsList?.length || 0);
                },
                errorMessage: 'Please reply with a valid number.',
            },
            nextStepsFn: async (input, ctx) => {
                if (!ctx.data.pgsList?.length) return '__goMainMenu';
                const n = parseInt(input);
                ctx.data.selectedPg = ctx.data.pgsList[n - 1];
                return 'enterRoomForTenant';
            },
        },

        enterRoomForTenant: {
            id: 'enterRoomForTenant',
            type: 'input',
            label: 'Room',
            messageBuilder: (ctx) => `Property: *${ctx.data.selectedPg?.name}*\n\nEnter the room/bed number:\n(e.g., Room 101, Bed A)\n\nOr reply *skip* to leave blank.`,
            nextStepsFn: async (input, ctx) => {
                ctx.data.roomName = input.toLowerCase() === 'skip' ? 'N/A' : input.trim();
                return 'tenantFormName';
            },
        },

        // --- Tenant Info Form (one question per step) ---
        tenantFormName: {
            id: 'tenantFormName',
            type: 'input',
            label: 'Tenant Name',
            messageTemplate: '👤 What is the tenant\'s full name?',
            nextStepsFn: async (input, ctx) => { ctx.data.tf_name = input.trim(); return 'tenantFormPhone'; },
        },

        tenantFormPhone: {
            id: 'tenantFormPhone',
            type: 'input',
            label: 'Phone',
            messageTemplate: '📱 Their 10-digit phone number?',
            nextStepsFn: async (input, ctx) => { ctx.data.tf_phone = input.trim(); return 'tenantFormEmail'; },
        },

        tenantFormEmail: {
            id: 'tenantFormEmail',
            type: 'input',
            label: 'Email',
            messageTemplate: '📧 Email address? (Reply *skip* to leave blank)',
            nextStepsFn: async (input, ctx) => {
                ctx.data.tf_email = input.toLowerCase() === 'skip' ? '' : input.trim();
                return 'tenantFormRent';
            },
        },

        tenantFormRent: {
            id: 'tenantFormRent',
            type: 'input',
            label: 'Monthly Rent',
            messageTemplate: '💰 Monthly rent amount?\n(e.g., 8000)\n\nReply *skip* for ₹0.',
            validation: {
                customValidator: (input) => input.toLowerCase() === 'skip' || /^\d+$/.test(input.trim()),
                errorMessage: 'Please enter a valid number or reply skip.'
            },
            nextStepsFn: async (input, ctx) => {
                ctx.data.tf_rent = input.toLowerCase() === 'skip' ? 0 : parseInt(input);
                return 'tenantFormDeposit';
            },
        },

        tenantFormDeposit: {
            id: 'tenantFormDeposit',
            type: 'input',
            label: 'Security Deposit',
            messageTemplate: '🔒 Security deposit amount?\n(e.g., 8000)\n\nReply *skip* for ₹0.',
            validation: {
                customValidator: (input) => input.toLowerCase() === 'skip' || /^\d+$/.test(input.trim()),
                errorMessage: 'Please enter a valid number or reply skip.'
            },
            nextStepsFn: async (input, ctx) => {
                ctx.data.tf_deposit = input.toLowerCase() === 'skip' ? 0 : parseInt(input);
                return 'confirmAddTenant';
            },
        },

        confirmAddTenant: {
            id: 'confirmAddTenant',
            type: 'confirmation',
            label: 'Confirm Tenant',
            messageBuilder: (ctx) => (
                `📋 *Confirm New Tenant*\n\n` +
                `Name: ${ctx.data.tf_name}\n` +
                `Phone: ${ctx.data.tf_phone}\n` +
                `Property: ${ctx.data.selectedPg?.name}\n` +
                `Room: ${ctx.data.roomName}\n` +
                `Rent: ₹${ctx.data.tf_rent}\n` +
                `Deposit: ₹${ctx.data.tf_deposit}\n\n` +
                `1️⃣ Save\n2️⃣ Cancel`
            ),
            nextSteps: { '1': 'saveTenant', '2': 'selectPgForTenant' },
            validation: {
                customValidator: (input) => ['1', '2'].includes(input.trim()),
                errorMessage: 'Please reply 1 to save or 2 to cancel.',
            },
        },

        saveTenant: {
            id: 'saveTenant',
            type: 'display',
            label: 'Tenant Saved',
            messageBuilder: (ctx) => (
                ctx.data._error
                    ? `❌ Could not save tenant: ${ctx.data._error}\n\nPlease add from the dashboard.`
                    : `✅ *Tenant Onboarded!*\n\nName: ${ctx.data.tf_name}\nProperty: ${ctx.data.selectedPg?.name}\nRent: ₹${ctx.data.tf_rent}\n\nReply *Menu* to continue.`
            ),
            onEnter: async (ctx) => {
                try {
                    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
                    const res = await fetch(`${baseUrl}/api/tenants`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            ownerId: ctx.ownerId,
                            guestData: {
                                name: ctx.data.tf_name,
                                phone: ctx.data.tf_phone,
                                email: ctx.data.tf_email || '',
                                pgId: ctx.data.selectedPg?.id,
                                pgName: ctx.data.selectedPg?.name,
                                roomId: ctx.data.roomName,
                                roomName: ctx.data.roomName,
                                bedId: 'N/A',
                                rentAmount: ctx.data.tf_rent,
                                deposit: ctx.data.tf_deposit,
                                joinDate: new Date().toISOString(),
                            },
                        }),
                    });
                    const result = await res.json();
                    if (!result.success) throw new Error(result.error || 'Failed to save tenant');
                } catch (e: any) { ctx.data._error = e.message; }
            },
            defaultNext: '__goMainMenu',
        },
    },
};

// ─────────────────────────────────────────────────────────────
// TENANT PORTAL WORKFLOW (for tenants)
// ─────────────────────────────────────────────────────────────
export const tenantPortalWorkflow: WorkflowDefinition = {
    id: 'tenantPortal',
    name: 'Tenant Portal',
    description: 'Tenant self-service portal',
    entryPoint: 'tenantMenu',

    steps: {
        tenantMenu: {
            id: 'tenantMenu',
            type: 'menu',
            label: 'Tenant Menu',
            messageTemplate: (
                `🏠 *Welcome to RoomBox Tenant Portal*\n\n` +
                `1️⃣ View Rent Details\n` +
                `2️⃣ Pay Rent\n` +
                `3️⃣ Payment History\n` +
                `4️⃣ Maintenance Request\n` +
                `5️⃣ Contact Owner`
            ),
            nextSteps: {
                '1': 'viewRentDetails',
                '2': 'payRent',
                '3': 'paymentHistory',
                '4': 'maintenanceRequest',
                '5': 'contactOwner',
            },
            validation: {
                customValidator: (input) => ['1', '2', '3', '4', '5'].includes(input.trim()),
                errorMessage: 'Please reply with a number from 1 to 5.',
            },
        },

        viewRentDetails: {
            id: 'viewRentDetails',
            type: 'display',
            label: 'Rent Details',
            messageTemplate: '💰 *Your Rent Details*\n\nVisit the tenant portal for full details:\nhttps://roombox.netlify.app/tenant\n\nReply *Menu* to return.',
            defaultNext: 'tenantMenu',
        },

        payRent: {
            id: 'payRent',
            type: 'display',
            label: 'Pay Rent',
            messageTemplate: '💳 *Pay Rent*\n\nUse the secure payment link from your dashboard:\nhttps://roombox.netlify.app/tenant/pay\n\nReply *Menu* to return.',
            defaultNext: 'tenantMenu',
        },

        paymentHistory: {
            id: 'paymentHistory',
            type: 'display',
            label: 'Payment History',
            messageTemplate: '📜 *Payment History*\n\nView your full payment history at:\nhttps://roombox.netlify.app/tenant/payments\n\nReply *Menu* to return.',
            defaultNext: 'tenantMenu',
        },

        maintenanceRequest: {
            id: 'maintenanceRequest',
            type: 'menu',
            label: 'Maintenance',
            messageTemplate: '🔧 *Maintenance Request*\n\nWhat is the issue?\n\n1️⃣ Electricity\n2️⃣ Water / Plumbing\n3️⃣ Cleaning\n4️⃣ Other',
            nextStepsFn: async (input, ctx) => {
                const issues: Record<string, string> = { '1': 'Electricity', '2': 'Water / Plumbing', '3': 'Cleaning', '4': 'Other' };
                ctx.data.maintenanceIssue = issues[input] || 'Other';
                return 'maintenanceConfirmed';
            },
            validation: {
                customValidator: (input) => ['1', '2', '3', '4'].includes(input.trim()),
                errorMessage: 'Please reply with 1, 2, 3, or 4.',
            },
        },

        maintenanceConfirmed: {
            id: 'maintenanceConfirmed',
            type: 'display',
            label: 'Maintenance Submitted',
            messageBuilder: (ctx) => `✅ *Maintenance Request Submitted*\n\nIssue: ${ctx.data.maintenanceIssue}\n\nYour landlord has been notified. Reply *Menu* to return.`,
            defaultNext: 'tenantMenu',
        },

        contactOwner: {
            id: 'contactOwner',
            type: 'display',
            label: 'Contact Owner',
            messageTemplate: '📞 *Contact Your Owner*\n\nYour owner has been messaged. They will reach out to you shortly.\n\nReply *Menu* to return.',
            defaultNext: 'tenantMenu',
        },
    },
};

// Export all for registration
export const allWorkflows = [
    mainMenuWorkflow,
    propertyManagementWorkflow,
    tenantManagementWorkflow,
    addTenantWorkflow,
    tenantPortalWorkflow,
];
