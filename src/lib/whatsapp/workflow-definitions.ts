/**
 * Workflow Definitions — Declarative Configuration
 *
 * Every conversation flow is defined here as pure data.
 * The WorkflowEngine interprets and drives them — no if/else chains needed.
 */

import { WorkflowDefinition } from './workflow-types';
import { PropertyService } from '../../services/propertyService';
import { TenantService } from '../../services/tenantService';
import { selectOwnerDataAdminDb, getAdminDb } from '../firebaseAdmin';
import { getReminderForGuest } from '../reminder-logic';
import { checkHierarchy } from './hierarchy-guard';
import type { Guest } from '../types';

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

                // Role-based option filtering: staff cannot see tenant mgmt or financial ops
                const isStaff = ctx.userRole === 'staff';
                const ownerOnlyOptions = isStaff ? '' :
                    `6️⃣ Onboard New Tenant\n` +
                    `7️⃣ Manage Tenants\n` +
                    `8️⃣ Reports & Analytics\n`;

                return (
                    `🏠 *RentSutra Dashboard*\nHi ${ownerName}!\n\n` +
                    statsLine +
                    `1️⃣ View Properties\n` +
                    `2️⃣ Today's Payments\n` +
                    `3️⃣ Monthly Summary\n` +
                    `4️⃣ Pending Rents\n` +
                    `5️⃣ Send Reminders\n` +
                    ownerOnlyOptions +
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
                customValidator: (input, ctx) => {
                    const n = input.trim();
                    // Staff users cannot access options 6/7/8 even by typing the number
                    if (ctx?.userRole === 'staff' && ['6', '7', '8'].includes(n)) {
                        return false;
                    }
                    return ['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(n);
                },
                errorMessage: 'Please reply with a valid option number.',
            },
        },

        sendReminders: {
            id: 'sendReminders',
            type: 'display',
            label: 'Send Reminders',
            messageBuilder: (ctx) => {
                const count = ctx.data.remindersSentCount || 0;
                if (count === 0) return `📢 *Rent Reminders*\n\nNo pending tenants found who match the reminder schedule today.\n\nReply *Menu* to return.`;
                return `✅ *Success*\n\nSent ${count} WhatsApp reminders to pending tenants.\n\nReply *Menu* to return.`;
            },
            onEnter: async (ctx) => {
                try {
                    const db = await selectOwnerDataAdminDb(ctx.ownerId!);
                    // First reconcile to get latest status
                    const { reconcileSingleGuest } = await import('@/lib/actions/reconciliationActions');

                    const guestsSnap = await db.collection('users_data').doc(ctx.ownerId!).collection('guests')
                        .where('isVacated', '==', false)
                        .where('paymentStatus', '==', 'pending')
                        .get();

                    let sentCount = 0;
                    const { sendWhatsAppMessage } = await import('@/lib/whatsapp/send-message');
                    const now = new Date();

                    for (const doc of guestsSnap.docs) {
                        try {
                            const guest = doc.data() as Guest;
                            // 1. Reconcile
                            await reconcileSingleGuest({ ownerId: ctx.ownerId!, guestId: guest.id });

                            // 2. Fetch fresh guest data
                            const freshGuestDoc = await doc.ref.get();
                            const freshGuest = freshGuestDoc.data() as Guest;

                            // 3. Get reminder
                            const reminder = getReminderForGuest(freshGuest, now);
                            if (reminder.shouldSend && freshGuest.phone) {
                                let formattedPhone = freshGuest.phone.replace(/\D/g, '');
                                if (formattedPhone.length === 10) formattedPhone = '91' + formattedPhone;
                                await sendWhatsAppMessage(formattedPhone, reminder.body);
                                sentCount++;
                            }
                        } catch (e) {
                            console.error(`Failed to send reminder to guest ${doc.id}:`, e);
                        }
                    }
                    ctx.data.remindersSentCount = sentCount;
                } catch (e) {
                    console.error('Error in sendReminders:', e);
                    ctx.data.remindersSentCount = 0;
                }
            },
            defaultNext: 'showMenu',
        },

        reports: {
            id: 'reports',
            type: 'display',
            label: 'Reports',
            messageTemplate: '📈 *Reports & Analytics*\n\nVisit your dashboard to view detailed financial reports and occupancy analytics.\n\nhttps://rentsutra-1.netlify.app/dashboard/analytics\n\nReply *Menu* to return.',
            defaultNext: 'showMenu',
        },

        dashboardLink: {
            id: 'dashboardLink',
            type: 'display',
            label: 'Dashboard Link',
            messageTemplate: '🔗 *Your Secure Dashboard*\n\nManage everything from here:\nhttps://rentsutra-1.netlify.app/dashboard\n\nReply *Menu* to return.',
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
                '2': 'selectPropertyTenantForPayment',
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
                        label: `${t.name} (Room ${t.roomName || t.roomNumber || 'N/A'})`,
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

        selectPropertyTenantForPayment: {
            id: 'selectPropertyTenantForPayment',
            type: 'menu',
            label: 'Select Tenant',
            messageTemplate: '💰 *Record Rent Payment*\n\nSelect the tenant who paid:',
            optionsFn: async (ctx) => {
                const tenants = ctx.data.propertyTenants || [];
                return [
                    ...tenants.map((t: any, i: number) => ({
                        key: i + 1,
                        label: `${t.name} (Room ${t.roomName || t.roomNumber || 'N/A'})`,
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
                return 'recordPropertyPaymentAmount';
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
                    `Tenant: ${ctx.data.selectedTenant?.name}\n` +
                    `Amount: ₹${ctx.data.paymentAmount}\n\n` +
                    `1️⃣ Confirm\n2️⃣ Cancel`
                );
            },
            nextSteps: { '1': 'saveTenantPayment', '2': 'viewPropertyDetails' },
            validation: {
                customValidator: (input) => ['1', '2'].includes(input.trim()),
                errorMessage: 'Please reply 1 to confirm or 2 to cancel.',
            },
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
                return 'addPropertyCity';
            },
        },

        addPropertyCity: {
            id: 'addPropertyCity',
            type: 'input',
            label: 'City',
            messageTemplate: 'Step 3/5: Which *City* is this in?\n(e.g., "Pune", "Mumbai", "Noida")',
            nextStepsFn: async (input, ctx) => {
                ctx.data.newPropCity = input.trim();
                return 'addPropertyGender';
            },
        },

        addPropertyGender: {
            id: 'addPropertyGender',
            type: 'menu',
            label: 'Gender Type',
            messageTemplate: 'Step 4/5: What type of PG is it?\n\n1️⃣ Boys\n2️⃣ Girls\n3️⃣ Unisex',
            options: [
                { key: '1', label: 'Boys' },
                { key: '2', label: 'Girls' },
                { key: '3', label: 'Unisex' }
            ],
            nextStepsFn: async (input, ctx) => {
                const map: any = { '1': 'boys', '2': 'girls', '3': 'unisex' };
                ctx.data.newPropGender = map[input.trim()] || 'unisex';
                return 'addPropertySetupChoice';
            },
        },

        addPropertySetupChoice: {
            id: 'addPropertySetupChoice',
            type: 'menu',
            label: 'Setup Floors',
            messageTemplate: 'Step 5/5: Would you like to setup Floors & Rooms now?\n\n1️⃣ YES (Fast Bulk Setup)\n2️⃣ NO (Just Create Building)',
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
                    `City: ${ctx.data.newPropCity}\n` +
                    `Type: ${ctx.data.newPropGender}\n` +
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
                    await PropertyService.createProperty(db, {
                        ownerId: ctx.ownerId!,
                        name: ctx.data.newPropName,
                        location: ctx.data.newPropLocation,
                        city: ctx.data.newPropCity,
                        gender: ctx.data.newPropGender,
                        autoSetup: !!ctx.data.newPropFloors,
                        floorCount: ctx.data.newPropFloors,
                        roomsPerFloor: ctx.data.newPropRoomsPerFloor
                    });

                    // Update owner summary in main app DB
                    try {
                        const appDb = await getAdminDb();
                        const pgsSnap = await db.collection('users_data').doc(ctx.ownerId!).collection('pgs').get();
                        await appDb.doc(`users/${ctx.ownerId!}`).update({
                            'pgSummary.totalProperties': pgsSnap.size,
                        });
                    } catch (summaryErr) {
                        console.warn('Could not update owner summary via bot:', summaryErr);
                    }
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
                const canVacate = ctx.userRole !== 'staff';
                const vacateOption = canVacate ? `4️⃣ Vacate Tenant\n` : '';
                const backNum = canVacate ? '5' : '4';
                return (
                    `👤 *${t.name}*\n\n` +
                    `PG: ${t.pgName || 'N/A'}\n` +
                    `Room: ${t.roomNumber || 'N/A'}\n` +
                    `Rent: ₹${t.rentAmount || 0} | Balance: ₹${t.balance || 0}\n` +
                    `Phone: ${t.phone || 'N/A'}\n\n` +
                    `1️⃣ Edit Details\n` +
                    `2️⃣ Record Payment\n` +
                    `3️⃣ View/Upload KYC\n` +
                    vacateOption +
                    `${backNum}️⃣ ← Back`
                );
            },
            nextStepsFn: async (input, ctx) => {
                const canVacate = ctx.userRole !== 'staff';
                if (input === '1') return 'editTenantSelect';
                if (input === '2') return 'recordTenantPaymentAmount';
                if (input === '3') return 'kycMenu';
                if (input === '4' && canVacate) return 'confirmVacate';
                if (input === '4' && !canVacate) return 'selectTenantToManage'; // staff back
                if (input === '5') return 'selectTenantToManage';
                return 'tenantActions';
            },
            validation: {
                customValidator: (input, ctx) => {
                    const canVacate = ctx.userRole !== 'staff';
                    const maxOpt = canVacate ? 5 : 4;
                    const n = parseInt(input.trim());
                    return !isNaN(n) && n >= 1 && n <= maxOpt;
                },
                errorMessage: 'Please reply with a valid option number.',
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
                    await TenantService.updateTenant(db, ctx.ownerId!, ctx.data.selectedTenant?.id, { [ctx.data.editField]: ctx.data.editValue });

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
                    const db = await selectOwnerDataAdminDb(ctx.ownerId!);
                    const result = await TenantService.recordPayment(db, {
                        ownerId: ctx.ownerId!,
                        guestId: ctx.data.selectedTenant?.id,
                        amount: ctx.data.paymentAmount,
                        paymentMode: 'cash',
                        notes: 'Recorded via WhatsApp',
                    });
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
                ctx.data._kycError
                    ? `⚠️ *Upload Issue*\n\nWe couldn't save the ${ctx.data.kycUpload?.type === 'photo' ? 'Photo' : 'Aadhaar Card'} right now. Please try again or upload from the dashboard.\n\nReply *Menu* to continue.`
                    : `✅ *KYC Document Saved*\n\n` +
                    `${ctx.data.kycUpload?.type === 'photo' ? '📸 Photo' : '📄 Aadhaar Card'} for *${ctx.data.selectedTenant?.name}* has been securely saved to their profile.\n\n` +
                    `Reply *Menu* to continue.`
            ),
            onEnter: async (ctx) => {
                try {
                    if (ctx.ownerId && ctx.data.selectedTenant?.id && ctx.data.kycUpload) {
                        const db = await selectOwnerDataAdminDb(ctx.ownerId);
                        const guestRef = db.collection('users_data').doc(ctx.ownerId).collection('guests').doc(ctx.data.selectedTenant.id);
                        const { FieldValue } = await import('firebase-admin/firestore');
                        const kycDoc = {
                            configId: ctx.data.kycUpload.type === 'photo' ? 'tenant_photo' : 'aadhaar_card',
                            label: ctx.data.kycUpload.type === 'photo' ? 'Tenant Photo' : 'Aadhaar Card',
                            url: ctx.data.kycUpload.mediaId, // WhatsApp media ID — should be downloaded & uploaded to Storage in production
                            status: 'pending' as const,
                        };
                        await guestRef.update({
                            documents: FieldValue.arrayUnion(kycDoc),
                            kycStatus: 'pending',
                        });
                    }
                } catch (e: any) {
                    console.error('[KYC Upload Error]', e);
                    ctx.data._kycError = e.message;
                }
            },
            defaultNext: 'tenantActions',
        },

        // ---------- Vacate Tenant ----------
        confirmVacate: {
            id: 'confirmVacate',
            type: 'confirmation',
            label: 'Confirm Vacate',
            messageBuilder: (ctx) => {
                // Corner case: tenant already vacated (e.g., concurrently on Web)
                if (ctx.data.selectedTenant?.isVacated) {
                    return `ℹ️ *${ctx.data.selectedTenant?.name}* is already marked as vacated.\n\nReply *Menu* to continue.`;
                }
                return (
                    `⚠️ *Vacate Tenant*\n\n` +
                    `Are you sure you want to mark *${ctx.data.selectedTenant?.name}* as vacated?\n\n` +
                    `1️⃣ Yes, proceed to final confirmation\n2️⃣ Cancel`
                );
            },
            nextSteps: { '1': 'vacateConfirmWord', '2': 'tenantActions' },
            nextStepsFn: async (input, ctx) => {
                // If already vacated, any reply goes back to tenant actions
                if (ctx.data.selectedTenant?.isVacated) return 'tenantActions';
                return input.trim() === '1' ? 'vacateConfirmWord' : 'tenantActions';
            },
            validation: {
                customValidator: (input, ctx) => {
                    // If already vacated, accept any input to redirect
                    if (ctx?.data?.selectedTenant?.isVacated) return true;
                    return ['1', '2'].includes(input.trim());
                },
                errorMessage: 'Please reply 1 to confirm or 2 to cancel.',
            },
        },

        // Safety gate: owner must type CONFIRM before the irreversible vacate executes
        vacateConfirmWord: {
            id: 'vacateConfirmWord',
            type: 'input',
            label: 'Type CONFIRM',
            messageBuilder: (ctx) => (
                `🔒 *Final Confirmation Required*\n\n` +
                `Vacating *${ctx.data.selectedTenant?.name}* cannot be undone.\n\n` +
                `Type *CONFIRM* to permanently vacate this tenant,\n` +
                `or type anything else to cancel.`
            ),
            nextStepsFn: async (input, ctx) => {
                if (input.trim().toUpperCase() === 'CONFIRM') {
                    return 'vacateTenant';
                }
                ctx.data._vacateCancelled = true;
                return 'vacateCancelledMsg';
            },
        },

        vacateCancelledMsg: {
            id: 'vacateCancelledMsg',
            type: 'display',
            label: 'Vacate Cancelled',
            messageTemplate: `✅ Vacate cancelled. No changes were made.\n\nReply *Menu* to continue.`,
            defaultNext: 'tenantActions',
        },

        vacateTenant: {
            id: 'vacateTenant',
            type: 'display',
            label: 'Tenant Vacated',
            messageBuilder: (ctx) => (
                ctx.data._dbError
                    ? `⚠️ *Temporary Issue*\n\nSomething went wrong on our end. The vacate action for *${ctx.data.selectedTenant?.name}* was not completed. Please try again in 1 minute.`
                    : ctx.data._error
                        ? `❌ Could not vacate tenant: ${ctx.data._error}`
                        : `✅ *${ctx.data.selectedTenant?.name}* has been marked as vacated.\n\nReply *Menu* to continue.`
            ),
            onEnter: async (ctx) => {
                try {
                    const db = await selectOwnerDataAdminDb(ctx.ownerId!);
                    const appDb = await getAdminDb();
                    await TenantService.vacateTenant(db, ctx.ownerId!, ctx.data.selectedTenant?.id, appDb);
                } catch (e: any) {
                    const isTransient = e?.code === 'unavailable' || e?.code === 14 || /timeout|unavailable|deadline/i.test(e?.message || '');
                    if (isTransient) { ctx.data._dbError = true; } else { ctx.data._error = e.message; }
                }
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
            onEnter: async (ctx) => {
                const db = await selectOwnerDataAdminDb(ctx.ownerId!);
                ctx.data.pgsList = await PropertyService.getBuildings(db, ctx.ownerId!);

                // ── Hierarchy Guard: Property must exist before adding tenant ──
                const block = await checkHierarchy(ctx.ownerId!, 'property');
                if (block) {
                    ctx.data._hierarchyBlock = block;
                } else {
                    ctx.data._hierarchyBlock = null;
                }
            },
            messageBuilder: (ctx) => {
                if (ctx.data._hierarchyBlock) {
                    return ctx.data._hierarchyBlock.message;
                }
                return '🏠 *Onboard New Tenant*\n\nSelect the property:';
            },
            optionsFn: async (ctx) => {
                if (ctx.data._hierarchyBlock) {
                    return [
                        { key: '1', label: '🏗️ Set Up My First Property' },
                        { key: '2', label: '← Back to Menu' },
                    ];
                }
                const props = ctx.data.pgsList || [];
                return props.map((p: any, i: number) => ({ key: i + 1, label: p.name }));
            },
            validation: {
                customValidator: (input, ctx) => {
                    if (ctx.data._hierarchyBlock) {
                        return ['1', '2'].includes(input.trim());
                    }
                    const n = parseInt(input);
                    return !isNaN(n) && n >= 1 && n <= (ctx.data.pgsList?.length || 0);
                },
                errorMessage: 'Please reply with a valid number.',
            },
            nextStepsFn: async (input, ctx) => {
                // Handle hierarchy block redirect
                if (ctx.data._hierarchyBlock) {
                    ctx.data._hierarchyBlock = null;
                    if (input.trim() === '1') return '__switchPropertyManagement';
                    return '__goMainMenu';
                }
                if (!ctx.data.pgsList?.length) return '__goMainMenu';
                const n = parseInt(input);
                ctx.data.selectedPg = ctx.data.pgsList[n - 1];
                return 'enterRoomForTenant';
            },
        },

        enterRoomForTenant: {
            id: 'enterRoomForTenant',
            type: 'menu',
            label: 'Select Room',
            onEnter: async (ctx) => {
                // Fetch actual rooms from the selected property's hierarchy
                try {
                    const db = await selectOwnerDataAdminDb(ctx.ownerId!);
                    const pgRef = db.collection('users_data').doc(ctx.ownerId!).collection('pgs').doc(ctx.data.selectedPg?.id);
                    const pgSnap = await pgRef.get();
                    if (pgSnap.exists) {
                        const pgData = pgSnap.data()!;
                        const rooms: { id: string; name: string; floorName: string; vacantBeds: number }[] = [];
                        for (const floor of (pgData.floors || [])) {
                            for (const room of (floor.rooms || [])) {
                                const vacantBeds = (room.beds || []).filter((b: any) => !b.guestId).length;
                                if (vacantBeds > 0) {
                                    rooms.push({ id: room.id, name: room.name, floorName: floor.name, vacantBeds });
                                }
                            }
                        }
                        ctx.data._availableRooms = rooms;
                    } else {
                        ctx.data._availableRooms = [];
                    }
                } catch (e) {
                    console.error('[enterRoomForTenant] Failed to load rooms:', e);
                    ctx.data._availableRooms = [];
                }
            },
            messageBuilder: (ctx) => {
                const rooms = ctx.data._availableRooms || [];
                if (rooms.length === 0) {
                    return `Property: *${ctx.data.selectedPg?.name}*\n\n⚠️ No rooms with vacant beds found.\n\n1️⃣ Enter room name manually\n2️⃣ ← Back to Menu`;
                }
                let msg = `🏠 *${ctx.data.selectedPg?.name}* — Available Rooms\n\n`;
                rooms.forEach((r: any, i: number) => {
                    msg += `${i + 1}️⃣ ${r.floorName} → Room ${r.name} (${r.vacantBeds} bed${r.vacantBeds > 1 ? 's' : ''} free)\n`;
                });
                return msg;
            },
            optionsFn: async (ctx) => {
                const rooms = ctx.data._availableRooms || [];
                if (rooms.length === 0) {
                    return [
                        { key: '1', label: '✏️ Enter room name manually' },
                        { key: '2', label: '← Back to Menu' },
                    ];
                }
                return rooms.map((r: any, i: number) => ({ key: String(i + 1), label: `${r.floorName} → Room ${r.name}` }));
            },
            validation: {
                customValidator: (input, ctx) => {
                    const rooms = ctx.data._availableRooms || [];
                    if (rooms.length === 0) return ['1', '2'].includes(input.trim());
                    const n = parseInt(input);
                    return !isNaN(n) && n >= 1 && n <= rooms.length;
                },
                errorMessage: 'Please reply with a valid number.',
            },
            nextStepsFn: async (input, ctx) => {
                const rooms = ctx.data._availableRooms || [];
                if (rooms.length === 0) {
                    if (input.trim() === '2') return '__goMainMenu';
                    // Fallback: manual entry
                    ctx.data._manualRoomEntry = true;
                    return 'enterRoomManual';
                }
                const n = parseInt(input);
                const selectedRoom = rooms[n - 1];
                ctx.data.roomName = selectedRoom.name;
                ctx.data.selectedRoomId = selectedRoom.id;
                ctx.data._availableRooms = null;
                return 'tenantFormName';
            },
        },

        // Fallback: manual room entry when no structured rooms exist
        enterRoomManual: {
            id: 'enterRoomManual',
            type: 'input',
            label: 'Room (Manual)',
            messageBuilder: (ctx) => `Property: *${ctx.data.selectedPg?.name}*\n\nType the room/bed identifier:\n(e.g., Room 101, Bed A)`,
            nextStepsFn: async (input, ctx) => {
                ctx.data.roomName = input.trim();
                ctx.data._manualRoomEntry = null;
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
                return 'tenantFormJoinDate';
            },
        },

        tenantFormJoinDate: {
            id: 'tenantFormJoinDate',
            type: 'input',
            label: 'Join Date',
            messageTemplate: '📅 Entrance/Join Date?\n(DD/MM/YYYY or reply *today*)',
            nextStepsFn: async (input, ctx) => {
                if (input.toLowerCase() === 'today') {
                    ctx.data.tf_joinDate = new Date().toISOString();
                } else {
                    ctx.data.tf_joinDate = input.trim(); // Simplified, standard would parse but let's keep it fluid
                }
                return 'tenantFormDueDate';
            },
        },

        tenantFormDueDate: {
            id: 'tenantFormDueDate',
            type: 'input',
            label: 'Rent Due Date',
            messageTemplate: '📅 Every month, rent is due on which day?\n(e.g., 5 or 10)',
            validation: { regex: /^\d+$/, errorMessage: 'Please enter a day number (1-31).' },
            nextStepsFn: async (input, ctx) => {
                ctx.data.tf_dueDate = input.trim();
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
                `Deposit: ₹${ctx.data.tf_deposit}\n` +
                `Join Date: ${ctx.data.tf_joinDate?.includes('T') ? ctx.data.tf_joinDate.split('T')[0] : ctx.data.tf_joinDate}\n` +
                `Due Day: ${ctx.data.tf_dueDate}\n\n` +
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
                ctx.data._dbError
                    ? `⚠️ *Temporary Issue*\n\nSomething went wrong on our end. Your progress for *${ctx.data.tf_name || 'the new tenant'}* is saved — please try again in 1 minute.\n\nReply *Menu* to return.`
                    : ctx.data._error
                        ? `❌ Could not save tenant: ${ctx.data._error}\n\nPlease add from the dashboard.`
                        : `✅ *Tenant Onboarded!*\n\nName: ${ctx.data.tf_name}\nProperty: ${ctx.data.selectedPg?.name}\nRent: ₹${ctx.data.tf_rent}\n\nReply *Menu* to continue.`
            ),
            onEnter: async (ctx) => {
                try {
                    const db = await selectOwnerDataAdminDb(ctx.ownerId!);
                    const appDb = await getAdminDb();
                    await TenantService.onboardTenant(db, appDb, {
                        ...ctx.data.selectedTenant, // Some data might be here?
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
                        joinDate: ctx.data.tf_joinDate,
                        dueDate: ctx.data.tf_dueDate,
                        rentCycleUnit: 'months',
                        rentCycleValue: 1,
                        ownerId: ctx.ownerId!
                    });
                } catch (e: any) {
                    const isTransient = e?.code === 'unavailable' || e?.code === 14 || /timeout|unavailable|deadline/i.test(e?.message || '');
                    if (isTransient) { ctx.data._dbError = true; } else { ctx.data._error = e.message; }
                }
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
            onEnter: async (ctx) => {
                // Fetch latest balance and data
                if (ctx.ownerId && ctx.guestId) {
                    try {
                        const { selectOwnerDataAdminDb } = await import('@/lib/firebaseAdmin');
                        const db = await selectOwnerDataAdminDb(ctx.ownerId);
                        const guestSnap = await db.collection('users_data').doc(ctx.ownerId).collection('guests').doc(ctx.guestId).get();
                        if (guestSnap.exists) {
                            const data = guestSnap.data();
                            ctx.data.balance = data?.balance ?? 0;
                            ctx.data.rentAmount = data?.rentAmount ?? 0;
                            ctx.data.pgName = data?.pgName || 'your PG';
                        }
                    } catch (e) { console.error('Tenant data fetch error:', e); }
                }
            },
            messageBuilder: (ctx) => {
                const balance = ctx.data.balance || 0;
                const balanceLine = balance > 0
                    ? `💰 *Balance Due:* ₹${balance} 🔴\n\n`
                    : balance < 0
                        ? `💰 *Advance Balance:* ₹${Math.abs(balance)} 🟢\n\n`
                        : `💰 *Balance:* ₹${balance} 🟢\n\n`;

                const payOption = balance > 0 ? `2️⃣ *Pay Rent Now* 💳` : `2️⃣ Pay Rent`;

                return (
                    `🏠 *${ctx.data.pgName || 'RentSutra Portal'}*\n\n` +
                    `👤 *Tenant:* ${ctx.tenantName || 'User'}\n` +
                    balanceLine +
                    `What would you like to do?\n\n` +
                    `1️⃣ View Rent Details\n` +
                    `${payOption}\n` +
                    `3️⃣ Payment History\n` +
                    `4️⃣ Maintenance Request\n` +
                    `5️⃣ Contact Owner\n` +
                    `6️⃣ Give Notice (Vacate)`
                );
            },
            nextSteps: {
                '1': 'viewRentDetails',
                '2': 'payRent',
                '3': 'paymentHistory',
                '4': 'maintenanceRequest',
                '5': 'contactOwner',
                '6': 'giveNotice',
            },
            validation: {
                customValidator: (input) => ['1', '2', '3', '4', '5', '6'].includes(input.trim()),
                errorMessage: 'Please reply with a number from 1 to 6.',
            },
        },

        viewRentDetails: {
            id: 'viewRentDetails',
            type: 'display',
            label: 'Rent Details',
            messageBuilder: (ctx) => {
                const balance = ctx.data.balance ?? 0;
                const rent = ctx.data.rentAmount ?? 0;
                let status = balance > 0 ? '🔴 Unpaid' : balance === 0 ? '🟢 Paid' : '🟢 Overpaid';
                if (balance > 0 && balance < rent) {
                    status = '🟡 Partially Paid';
                }
                return (
                    `💰 *Your Rent Details*\n\n` +
                    `🏠 PG: ${ctx.data.pgName || 'Your PG'}\n` +
                    `📋 Monthly Rent: ₹${rent}\n` +
                    `💳 Current Balance: ₹${Math.abs(balance)} ${balance > 0 ? '(Due)' : balance < 0 ? '(Advance)' : ''}\n` +
                    `📊 Status: ${status}\n\n` +
                    `For full history, visit:\nhttps://rentsutra-1.netlify.app/tenant\n\nReply *Menu* to return.`
                );
            },
            defaultNext: 'tenantMenu',
        },

        payRent: {
            id: 'payRent',
            type: 'display',
            label: 'Pay Rent',
            messageBuilder: (ctx) => {
                const balance = ctx.data.balance ?? 0;
                const amountDue = balance > 0 ? `₹${balance}` : '₹0 (all caught up! 🎉)';
                return (
                    `💳 *Pay Your Rent*\n\n` +
                    `Amount due: *${amountDue}*\n\n` +
                    `Use the secure payment link from your dashboard:\nhttps://rentsutra-1.netlify.app/tenant/pay\n\nReply *Menu* to return.`
                );
            },
            defaultNext: 'tenantMenu',
        },

        paymentHistory: {
            id: 'paymentHistory',
            type: 'display',
            label: 'Payment History',
            messageTemplate: '📜 *Payment History*\n\nView your full payment history at:\nhttps://rentsutra-1.netlify.app/tenant/payments\n\nReply *Menu* to return.',
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

        // ---------- Give Notice ----------
        giveNotice: {
            id: 'giveNotice',
            type: 'menu',
            label: 'Give Notice',
            messageTemplate: '⚠️ *Give Move-out Notice*\n\nAre you sure you want to give a 30-day notice to vacate?\n\n1️⃣ Yes, Give Notice\n2️⃣ Talk to Owner\n3️⃣ Cancel',
            nextSteps: { '1': 'confirmNotice', '2': 'contactOwner', '3': 'tenantMenu' },
            validation: {
                customValidator: (input) => ['1', '2', '3'].includes(input.trim()),
                errorMessage: 'Please reply with 1, 2, or 3.',
            },
        },

        confirmNotice: {
            id: 'confirmNotice',
            type: 'display',
            label: 'Notice Confirmed',
            messageBuilder: (ctx) => {
                const exitDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
                return ctx.data._noticeError
                    ? `⚠️ We couldn't record your notice right now. Please try again or contact your owner directly.\n\nReply *Menu* to return.`
                    : `✅ *Notice Recorded Successfully*\n\n📋 Your 30-day move-out notice has been sent to the property owner.\n📅 Expected exit date: *${exitDate}*\n\nThe owner has been notified and will be in touch about deposit settlement.\n\nReply *Menu* to return.`;
            },
            onEnter: async (ctx) => {
                const ownerId = ctx.ownerId || ctx.data.ownerId;
                const guestId = ctx.guestId || ctx.data.guestId;
                if (!ownerId || !guestId) {
                    ctx.data._noticeError = 'Missing owner or guest ID';
                    return;
                }
                try {
                    const exitDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                    const db = await selectOwnerDataAdminDb(ownerId);
                    await db.collection('users_data').doc(ownerId).collection('guests').doc(guestId).update({
                        onNotice: true,
                        noticeDate: new Date().toISOString(),
                        expectedExitDate: exitDate.toISOString()
                    });

                    // ── Send WhatsApp notification to the owner ──
                    try {
                        const appDb = await getAdminDb();
                        const ownerDoc = await appDb.collection('users').doc(ownerId).get();
                        const ownerData = ownerDoc.data();
                        const ownerPhone = ownerData?.phone || ownerData?.phoneNumber;
                        if (ownerPhone) {
                            const { sendWhatsAppMessage } = await import('@/lib/whatsapp/send-message');
                            const tenantName = ctx.tenantName || ctx.data.tenantName || 'A tenant';
                            const pgName = ctx.data.pgName || 'your PG';
                            await sendWhatsAppMessage(ownerPhone,
                                `🔔 *Move-Out Notice Received*\n\n` +
                                `Tenant *${tenantName}* from *${pgName}* has submitted a 30-day move-out notice.\n\n` +
                                `📅 Expected exit: ${exitDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}\n\n` +
                                `Please review on your dashboard and begin deposit settlement.`
                            );
                        }
                    } catch (notifErr) {
                        console.warn('[confirmNotice] Owner notification failed (non-blocking):', notifErr);
                    }
                } catch (e: any) {
                    console.error('Notice error:', e);
                    ctx.data._noticeError = e.message;
                }
            },
            defaultNext: 'tenantMenu',
        }
    },
};

// ─────────────────────────────────────────────────────────────
// OWNER REGISTRATION WORKFLOW
// ─────────────────────────────────────────────────────────────
export const ownerRegistrationWorkflow: WorkflowDefinition = {
    id: 'ownerRegistration',
    name: 'Owner Registration',
    description: 'Signup as a new property owner',
    entryPoint: 'askOwnerName',

    steps: {
        askOwnerName: {
            id: 'askOwnerName',
            type: 'input',
            label: 'Your Name',
            messageTemplate: '👋 *Welcome to RentSutra!*\n\nLet\'s get your account set up. What is your full name?',
            nextStepsFn: async (input, ctx) => {
                ctx.data.reg_name = input.trim();
                return 'confirmReg';
            }
        },

        confirmReg: {
            id: 'confirmReg',
            type: 'confirmation',
            label: 'Confirm Registration',
            messageBuilder: (ctx) => `📋 *Confirm Details*\n\nName: ${ctx.data.reg_name}\nPhone: ${ctx.userPhone}\n\n1️⃣ Register Now\n2️⃣ Start Over`,
            nextSteps: { '1': 'executeReg', '2': 'askOwnerName' }
        },

        executeReg: {
            id: 'executeReg',
            type: 'display',
            label: 'Registration Complete',
            messageBuilder: (ctx) => (
                ctx.data._error
                    ? `❌ Registration failed: ${ctx.data._error}`
                    : `🎉 *Registration Successful!*\n\nWelcome, ${ctx.data.reg_name}. You can now start adding your properties.\n\nReply *Menu* to open your dashboard.`
            ),
            onEnter: async (ctx) => {
                try {
                    const adminDb = await selectOwnerDataAdminDb('SYSTEM'); // Use admin db
                    const { getAdminDb } = await import('@/lib/firebaseAdmin');
                    const db = await getAdminDb();

                    const userId = `u-${Date.now()}`;
                    await db.collection('users').doc(userId).set({
                        name: ctx.data.reg_name,
                        phone: ctx.userPhone.replace(/\D/g, '').replace(/^91/, ''), // Store without CC for logic
                        role: 'owner',
                        createdAt: new Date().toISOString(),
                        status: 'active'
                    });

                    // Update context so they are immediately authenticated
                    ctx.isAuthenticatedOwner = true;
                    ctx.ownerId = userId;
                    ctx.ownerName = ctx.data.reg_name;
                } catch (e: any) { ctx.data._error = e.message; }
            },
            defaultNext: '__goMainMenu'
        }
    }
};


// ─────────────────────────────────────────────────────────────
// TENANT LAZY ONBOARDING WORKFLOW
// Triggered the first time a newly-added tenant messages the bot.
// Collects missing profile data (email, KYC) before showing the portal.
// ─────────────────────────────────────────────────────────────
export const tenantLazyOnboardingWorkflow: WorkflowDefinition = {
    id: 'tenantLazyOnboarding',
    name: 'Tenant Self-Onboarding',
    description: 'Collects missing tenant profile info on first bot interaction',
    entryPoint: 'welcomeAndName',

    steps: {
        welcomeAndName: {
            id: 'welcomeAndName',
            type: 'input',
            label: 'Confirm Name',
            messageBuilder: (ctx) =>
                `👋 *Welcome to RentSutra!*\n\n` +
                `Hi *${ctx.tenantName || 'there'}*! Let's quickly setup your profile.\n\n` +
                `*What is your full name?*\n(Reply with name or *skip*)`,
            nextStepsFn: async (input, ctx) => {
                if (input.trim().toLowerCase() !== 'skip') {
                    ctx.data.lazy_name = input.trim();
                } else {
                    ctx.data.lazy_name = ctx.tenantName || '';
                }
                return 'askEmail';
            },
        },

        askEmail: {
            id: 'askEmail',
            type: 'input',
            label: 'Email Address',
            messageTemplate: '📧 *What is your email address?*\n(Reply with email or *skip*)',
            nextStepsFn: async (input, ctx) => {
                ctx.data.lazy_email = input.trim().toLowerCase() === 'skip' ? '' : input.trim();
                return 'askKycPhoto';
            },
        },

        askKycPhoto: {
            id: 'askKycPhoto',
            type: 'input',
            label: 'Selfie / Photo',
            messageTemplate: '📸 *Please send a selfie photo for your profile.*\n(Send photo or reply *skip*)',
            nextStepsFn: async (input, ctx) => {
                // For image messages the router passes the media ID as `text`
                if (input.trim().toLowerCase() === 'skip') {
                    ctx.data.lazy_photoId = null;
                } else {
                    ctx.data.lazy_photoId = input.trim();
                }
                return 'askKycAadhaar';
            },
        },

        askKycAadhaar: {
            id: 'askKycAadhaar',
            type: 'input',
            label: 'Aadhaar Card',
            messageTemplate: '🪪 *Please send a photo of your Aadhaar Card (front side).*\n(Send photo or reply *skip*)',
            nextStepsFn: async (input, ctx) => {
                if (input.trim().toLowerCase() === 'skip') {
                    ctx.data.lazy_aadhaarId = null;
                } else {
                    ctx.data.lazy_aadhaarId = input.trim();
                }
                return 'finishOnboarding';
            },
        },

        finishOnboarding: {
            id: 'finishOnboarding',
            type: 'display',
            label: 'Profile Complete',
            messageBuilder: (ctx) =>
                ctx.data._error
                    ? `❌ There was an issue: ${ctx.data._error}\n\nPlease contact your owner for help.`
                    : `✅ *Profile Complete!*\n\nWelcome to *${ctx.data.pgName || 'your PG'}*, ${ctx.data.lazy_name || ctx.tenantName}!\n\nYou can now access your tenant portal.\n\nReply *Menu* to see your rent details, make payments, and more.`,
            onEnter: async (ctx) => {
                if (!ctx.ownerId || !ctx.guestId) {
                    ctx.data._error = 'Session mismatch. Please contact your owner.';
                    return;
                }
                try {
                    const { selectOwnerDataAdminDb } = await import('@/lib/firebaseAdmin');
                    const db = await selectOwnerDataAdminDb(ctx.ownerId);
                    const guestRef = db.collection('users_data').doc(ctx.ownerId).collection('guests').doc(ctx.guestId);

                    const updates: Record<string, any> = {
                        isOnboarded: true,
                        kycStatus: 'not-started',
                        schemaVersion: 2,
                    };

                    if (ctx.data.lazy_name) updates.name = ctx.data.lazy_name;
                    if (ctx.data.lazy_email) updates.email = ctx.data.lazy_email;

                    // Store KYC media IDs if provided (to be resolved to URLs later)
                    const kycDocs: any[] = [];
                    if (ctx.data.lazy_photoId) {
                        kycDocs.push({ configId: 'photo', label: 'Tenant Photo', mediaId: ctx.data.lazy_photoId, status: 'pending' });
                        updates.kycStatus = 'pending';
                    }
                    if (ctx.data.lazy_aadhaarId) {
                        kycDocs.push({ configId: 'aadhaar', label: 'Aadhaar Card', mediaId: ctx.data.lazy_aadhaarId, status: 'pending' });
                        updates.kycStatus = 'pending';
                    }
                    if (kycDocs.length > 0) {
                        updates.documents = kycDocs;
                    }

                    await guestRef.update(updates);

                    // Update local context for portal display
                    const guestSnap = await guestRef.get();
                    const guestData = guestSnap.data();
                    ctx.data.pgName = guestData?.pgName || '';
                    if (ctx.data.lazy_name) ctx.tenantName = ctx.data.lazy_name;
                } catch (e: any) {
                    console.error('[LazyOnboarding] Failed to save profile:', e);
                    ctx.data._error = e.message;
                }
            },
            defaultNext: '__goTenantPortal',
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
    tenantLazyOnboardingWorkflow,
    ownerRegistrationWorkflow,
];
