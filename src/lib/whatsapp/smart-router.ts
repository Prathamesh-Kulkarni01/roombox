/**
 * SMART WORKFLOW-BASED BOT ROUTER
 * 
 * Uses the workflow engine to route all messages dynamically
 * No hardcoded if/else chains - everything is configuration-driven
 */

import { sendWhatsAppMessage } from './send-message';
import { getSession, updateSession, clearSession } from './session-state';
import { workflowEngine } from './workflow-engine';
import { propertyManagementWorkflow, tenantManagementWorkflow } from './workflow-definitions';
import { WorkflowContext } from './workflow-types';
import { selectOwnerDataAdminDb, getAdminDb } from '../firebaseAdmin';
import { PropertyService } from '../../services/propertyService';
import { TenantService } from '../../services/tenantService';

// Register all workflows
workflowEngine.registerWorkflow(propertyManagementWorkflow);
workflowEngine.registerWorkflow(tenantManagementWorkflow);

/**
 * Main smart message handler
 * Routes everything through the workflow engine
 */
export async function handleMessageViaWorkflow(data: any) {
    const { from, msgBody } = data;
    const userInput = msgBody?.trim() || '';

    const session = getSession(from);
    
    // User not authenticated
    if (!session.data?.isAuthenticatedOwner) {
        await handleAuthentication(from, userInput, session);
        return;
    }

    // Load or initialize workflow context
    let workflowContext = session.data.workflowContext;
    
    if (!workflowContext) {
        // First time in workflow - ask what they want to do
        workflowContext = createMainMenuContext(session.data.ownerId, from);
        updateSession(from, 'IN_WORKFLOW', {
            ...session.data,
            workflowContext
        });
        
        const message = await getMainMenuMessage(session.data.ownerId);
        await sendWhatsAppMessage(from, message);
        return;
    }

    // Process user input through workflow
    console.log(`[Workflow] Processing input: "${userInput}"`);
    console.log(`[Workflow] Current step: ${workflowContext.currentStep}`);

    // Handle special commands
    if (userInput.toLowerCase() === 'menu' || userInput.toLowerCase() === 'hi') {
        // Reset to main menu
        workflowContext = createMainMenuContext(session.data.ownerId, from);
        updateSession(from, 'IN_WORKFLOW', {
            ...session.data,
            workflowContext
        });
        
        const message = await getMainMenuMessage(session.data.ownerId);
        await sendWhatsAppMessage(from, message);
        return;
    }

    // Add database helpers to context
    workflowContext.db = await selectOwnerDataAdminDb(session.data.ownerId);
    workflowContext.ownerId = session.data.ownerId;

    // Process through appropriate workflow
    const workflow = workflowEngine.getWorkflow(workflowContext.workflowId);
    if (!workflow) {
        await sendWhatsAppMessage(from, '❌ Workflow error. Reply *Menu* to restart.');
        return;
    }

    const result = await workflowEngine.processInput(userInput, workflowContext);

    if (!result.success) {
        // Validation error - show error and repeat current step
        await sendWhatsAppMessage(from, result.message);
        return;
    }

    if (result.nextStep) {
        // Show next step message
        await sendWhatsAppMessage(from, result.message);
        
        // Update workflow context
        workflowContext.currentStep = result.nextStep;
        updateSession(from, 'IN_WORKFLOW', {
            ...session.data,
            workflowContext
        });
    } else {
        // Workflow completed
        await sendWhatsAppMessage(from, '✅ Done! Reply *Menu* to continue.');
        workflowContext = createMainMenuContext(session.data.ownerId, from);
        updateSession(from, 'IN_WORKFLOW', {
            ...session.data,
            workflowContext
        });
    }
}

/**
 * Create main menu workflow context
 */
function createMainMenuContext(ownerId: string, phone: string): WorkflowContext {
    return {
        workflowId: 'mainMenu',
        currentStep: 'mainMenu',
        stepHistory: ['mainMenu'],
        inputHistory: [],
        data: {},
        lastMessage: '',
        availableOptions: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
        userId: ownerId,
        userPhone: phone,
        createdAt: new Date(),
        updatedAt: new Date(),
        sessionId: `${ownerId}-${Date.now()}`
    } as any;
}

/**
 * Get main menu message dynamically
 */
async function getMainMenuMessage(ownerId: string): Promise<string> {
    return `🏠 *Welcome!*\n\nWhat would you like to do?\n\n1️⃣ View Properties\n2️⃣ Today's Payments\n3️⃣ Monthly Summary\n4️⃣ Pending Rents\n5️⃣ Send Reminders\n6️⃣ Add Tenant\n7️⃣ Manage Tenants\n8️⃣ Reports\n9️⃣ Dashboard`;
}

/**
 * Handle main menu selection
 */
export async function handleMainMenuSelection(choice: string, session: any, from: string): Promise<void> {
    const ownerId = session.data.ownerId;

    switch (choice) {
        case '1': // View Properties
            const adminDb = await selectOwnerDataAdminDb(ownerId);
            const buildings = await PropertyService.getBuildings(adminDb, ownerId);
            
            let workflowContext = session.data.workflowContext;
            workflowContext.data.pgsList = buildings;
            workflowContext.currentStep = 'selectProperty';
            workflowContext.workflowId = 'propertyManagement';
            
            updateSession(from, 'IN_WORKFLOW', { ...session.data, workflowContext });
            await handleMessageViaWorkflow({ from, msgBody: '1' });
            break;

        case '6': // Add Tenant
            workflowContext = session.data.workflowContext;
            workflowContext.workflowId = 'tenantManagement';
            workflowContext.currentStep = 'selectPropertyForTenant';
            
            updateSession(from, 'IN_WORKFLOW', { ...session.data, workflowContext });
            await handleMessageViaWorkflow({ from, msgBody: '1' });
            break;

        // ... other menu items route to appropriate workflows
    }
}

/**
 * Authentication handler (for non-authenticated users)
 */
async function handleAuthentication(from: string, userInput: string, session: any): Promise<void> {
    // Implement existing auth logic
    // This stays the same for now
}

export default handleMessageViaWorkflow;
