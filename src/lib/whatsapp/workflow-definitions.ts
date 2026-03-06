/**
 * Workflow Definitions - Declarative Configuration
 * 
 * Define workflows as data, not code. Engine interprets them.
 */

import { WorkflowDefinition } from './workflow-types';
import { PropertyService } from '../../services/propertyService';
import { TenantService } from '../../services/tenantService';

/**
 * Property Management Workflow
 * Handles: View, Create, Update properties
 */
export const propertyManagementWorkflow: WorkflowDefinition = {
    id: 'propertyManagement',
    name: 'Property Management',
    description: 'View, create, and manage properties',
    entryPoint: 'selectProperty',
    
    steps: {
        selectProperty: {
            id: 'selectProperty',
            type: 'menu',
            label: 'Select Property',
            messageTemplate: '🏠 *Your Buildings (PGs)*',
            optionsFn: async (context) => {
                // Dynamic: Fetch from PropertyService
                const properties = context.data.pgsList || [];
                const opts = properties.map((p: any, i: number) => ({
                    key: i + 1,
                    label: `${p.name} (${p.occupancy}/${p.totalBeds} Occupied)`,
                    target: 'viewPropertyDetails',
                    action: 'selectProperty'
                }));
                
                // Add "Add New" option
                opts.push({
                    key: properties.length + 1,
                    label: 'Add New Property',
                    target: 'addPropertyForm',
                    action: 'addProperty'
                });
                
                return opts;
            },
            validation: {
                customValidator: (input, context) => {
                    const num = parseInt(input);
                    const count = (context.data.pgsList?.length || 0) + 1;
                    return !isNaN(num) && num >= 1 && num <= count;
                },
                errorMessage: 'Please select a valid option'
            },
            nextStepsFn: async (input, context) => {
                const num = parseInt(input);
                const count = context.data.pgsList?.length || 0;
                
                if (num === count + 1) {
                    return 'addPropertyForm';
                } else {
                    // Store selected property in context
                    context.data.selectedProperty = context.data.pgsList[num - 1];
                    return 'viewPropertyDetails';
                }
            }
        },

        viewPropertyDetails: {
            id: 'viewPropertyDetails',
            type: 'menu',
            label: 'View Property Details',
            messageBuilder: (context) => {
                const prop = context.data.selectedProperty;
                return `*${prop?.name}*\n\nLocation: ${prop?.location}\nBeds: ${prop?.totalBeds}\nOccupancy: ${prop?.occupancy}`;
            },
            options: [
                { key: 1, label: 'View Tenants', target: 'selectTenant' },
                { key: 2, label: 'Record Payment', target: 'recordPaymentInput' },
                { key: 3, label: 'Back to Properties', target: 'selectProperty' }
            ],
            nextSteps: {
                '1': 'selectTenant',
                '2': 'recordPaymentInput',
                '3': 'selectProperty'
            }
        },

        selectTenant: {
            id: 'selectTenant',
            type: 'menu',
            label: 'Select Tenant',
            messageTemplate: 'Select a tenant:',
            optionsFn: async (context) => {
                const tenants = context.data.tenants || [];
                return tenants.map((t: any, i: number) => ({
                    key: i + 1,
                    label: `${t.name} (Room ${t.roomNumber || 'N/A'})`,
                    target: 'viewTenantProfile'
                }));
            },
            nextStepsFn: async (input, context) => {
                const num = parseInt(input);
                context.data.selectedTenant = context.data.tenants[num - 1];
                return 'viewTenantProfile';
            }
        },

        viewTenantProfile: {
            id: 'viewTenantProfile',
            type: 'display',
            label: 'Tenant Profile',
            messageBuilder: (context) => {
                const t = context.data.selectedTenant;
                return `*${t?.name}*\n\nPhone: ${t?.phone}\nRent: ₹${t?.rentAmount}\nBalance: ₹${t?.balance}\nRoom: ${t?.roomNumber}`;
            },
            options: [
                { key: 1, label: 'Record Payment', target: 'recordPaymentInput' },
                { key: 2, label: 'Edit Details', target: 'editTenantForm' },
                { key: 3, label: 'Back', target: 'selectProperty' }
            ],
            nextSteps: {
                '1': 'recordPaymentInput',
                '2': 'editTenantForm',
                '3': 'selectProperty'
            }
        },

        recordPaymentInput: {
            id: 'recordPaymentInput',
            type: 'input',
            label: 'Record Payment',
            messageTemplate: '💰 How much to record?\n(e.g., 5000)',
            validation: {
                regex: /^\d+$/,
                errorMessage: 'Please enter a valid amount'
            },
            nextStepsFn: async (input, context) => {
                context.data.paymentAmount = parseInt(input);
                return 'recordPaymentConfirm';
            }
        },

        recordPaymentConfirm: {
            id: 'recordPaymentConfirm',
            type: 'confirmation',
            label: 'Confirm Payment',
            messageBuilder: (context) => {
                return `✅ *Confirm Payment*\n\nAmount: ₹${context.data.paymentAmount}\nTenant: ${context.data.selectedTenant?.name}\n\n1️⃣ Confirm\n2️⃣ Cancel`;
            },
            options: [
                { key: 1, label: 'Confirm', target: 'paymentCompleted', action: 'savePayment' },
                { key: 2, label: 'Cancel', target: 'selectProperty' }
            ],
            nextSteps: {
                '1': 'paymentCompleted',
                '2': 'selectProperty'
            },
            onExit: async (context) => {
                if (context.currentStep === 'recordPaymentConfirm') {
                    // Save payment to database
                    // await PaymentService.recordPayment(context);
                }
            }
        },

        paymentCompleted: {
            id: 'paymentCompleted',
            type: 'display',
            label: 'Payment Completed',
            messageTemplate: '✅ Payment recorded successfully!',
            defaultNext: 'selectProperty'
        },

        addPropertyForm: {
            id: 'addPropertyForm',
            type: 'form',
            label: 'Add Property',
            messageTemplate: '🏠 Add New Property',
            formFields: [
                {
                    id: 'propertyName',
                    type: 'text',
                    prompt: 'What is the property name?',
                    required: true
                },
                {
                    id: 'totalBeds',
                    type: 'number',
                    prompt: 'How many beds/rooms?',
                    validation: /^\d+$/,
                    required: true
                },
                {
                    id: 'location',
                    type: 'text',
                    prompt: 'Location/Address?',
                    required: true
                },
                {
                    id: 'baseRent',
                    type: 'number',
                    prompt: 'Base rent amount?',
                    validation: /^\d+$/,
                    required: true
                },
                {
                    id: 'securityDepositPercent',
                    type: 'number',
                    prompt: 'Security deposit (%)?',
                    validation: /^\d+$/,
                    required: true
                }
            ],
            onComplete: async (context) => {
                // Save property to database
                // await PropertyService.createProperty(context.data);
                return 'propertyCreated';
            },
            defaultNext: 'propertyCreated'
        },

        propertyCreated: {
            id: 'propertyCreated',
            type: 'display',
            label: 'Property Created',
            messageBuilder: (context) => {
                return `✅ Property Created!\n\nName: ${context.data.propertyName}\nBeds: ${context.data.totalBeds}\nLocation: ${context.data.location}`;
            },
            defaultNext: 'selectProperty'
        },

        editTenantForm: {
            id: 'editTenantForm',
            type: 'menu',
            label: 'Edit Tenant',
            messageTemplate: 'What would you like to edit?',
            options: [
                { key: 1, label: 'Name', target: 'editTenantName' },
                { key: 2, label: 'Rent Amount', target: 'editTenantRent' },
                { key: 3, label: 'Phone', target: 'editTenantPhone' },
                { key: 4, label: 'Cancel', target: 'selectProperty' }
            ],
            nextSteps: {
                '1': 'editTenantName',
                '2': 'editTenantRent',
                '3': 'editTenantPhone',
                '4': 'selectProperty'
            }
        },

        editTenantName: {
            id: 'editTenantName',
            type: 'input',
            label: 'Edit Tenant Name',
            messageTemplate: 'New name?',
            nextStepsFn: async (input, context) => {
                context.data.updatedField = 'name';
                context.data.updatedValue = input;
                return 'editTenantConfirm';
            }
        },

        editTenantRent: {
            id: 'editTenantRent',
            type: 'input',
            label: 'Edit Rent Amount',
            messageTemplate: 'New rent amount?',
            validation: { regex: /^\d+$/ },
            nextStepsFn: async (input, context) => {
                context.data.updatedField = 'rentAmount';
                context.data.updatedValue = input;
                return 'editTenantConfirm';
            }
        },

        editTenantPhone: {
            id: 'editTenantPhone',
            type: 'input',
            label: 'Edit Phone',
            messageTemplate: 'New phone number?',
            validation: { regex: /^\d{10}$/ },
            nextStepsFn: async (input, context) => {
                context.data.updatedField = 'phone';
                context.data.updatedValue = input;
                return 'editTenantConfirm';
            }
        },

        editTenantConfirm: {
            id: 'editTenantConfirm',
            type: 'confirmation',
            label: 'Confirm Edit',
            messageBuilder: (context) => {
                return `Update ${context.data.updatedField} to ${context.data.updatedValue}?\n\n1️⃣ Yes\n2️⃣ No`;
            },
            options: [
                { key: 1, label: 'Yes', target: 'editCompleted' },
                { key: 2, label: 'No', target: 'editTenantForm' }
            ],
            nextSteps: {
                '1': 'editCompleted',
                '2': 'editTenantForm'
            }
        },

        editCompleted: {
            id: 'editCompleted',
            type: 'display',
            label: 'Edit Completed',
            messageTemplate: '✅ Updated successfully!',
            defaultNext: 'selectProperty'
        }
    }
};
