/**
 * Workflow Engine - Type Definitions
 *
 * Defines the structure for dynamic, context-aware workflows
 */

export type StepType = 'menu' | 'form' | 'display' | 'input' | 'confirmation';

export interface WorkflowOption {
    key: string | number;
    label: string;
    target?: string;
    action?: string;
    condition?: (context: WorkflowContext) => boolean;
}

export interface StepDefinition {
    id: string;
    type: StepType;
    label: string;

    // Message generation (at least one must be present)
    messageTemplate?: string;
    messageBuilder?: (context: WorkflowContext) => string;

    // Options
    options?: WorkflowOption[];
    optionsFn?: (context: WorkflowContext) => Promise<WorkflowOption[]>;

    // Validation
    validation?: {
        regex?: RegExp;
        errorMessage?: string;
        customValidator?: (input: string, context: WorkflowContext) => boolean;
    };

    // Multi-step form support
    formFields?: FormField[];
    currentFieldIndex?: number;

    // Routing
    nextSteps?: { [input: string]: string };
    nextStepsFn?: (input: string, context: WorkflowContext) => Promise<string>;
    defaultNext?: string;

    // Callbacks
    onEnter?: (context: WorkflowContext) => Promise<void>;
    onExit?: (context: WorkflowContext) => Promise<void>;
    onComplete?: (context: WorkflowContext) => Promise<string | void>; // returns next step or void
}

export interface FormField {
    id: string;
    type: 'text' | 'number' | 'email' | 'select';
    prompt: string;
    validation?: RegExp;
    errorMessage?: string;
    required?: boolean;
}

export interface WorkflowDefinition {
    id: string;
    name: string;
    description: string;
    entryPoint: string;
    steps: { [stepId: string]: StepDefinition };
    timeout?: number;
}

export interface WorkflowContext {
    // Which workflow + step we're in
    workflowId: string;
    currentStep: string;

    // History
    stepHistory: string[];
    inputHistory: string[];

    // Collected data (form fields, selections, etc.)
    data: { [key: string]: any };

    // UI state
    lastMessage: string;
    availableOptions: (string | number)[];

    // Auth
    isAuthenticatedOwner: boolean;
    isAuthenticatedTenant: boolean;
    ownerId?: string;
    ownerName?: string;
    tenantName?: string;
    guestId?: string;
    pgId?: string;
    identifiedAccounts?: any[]; // Array of owner/tenant matches
    selectedAccountId?: string; // Index or ID of selected account

    // User identity
    userId: string;
    userPhone: string;

    // Metadata
    createdAt: Date;
    updatedAt: Date;
    sessionId: string;

    // Runtime helpers (not serialized)
    db?: any;
}

export interface WorkflowResult {
    success: boolean;
    message: string;
    nextStep?: string;
    context: WorkflowContext;
    data?: any;
    error?: string;
    /** If true, the caller should not send any message (handler did it manually) */
    silent?: boolean;
}

export interface ParsedInput {
    raw: string;
    normalized: string;
    isValid: boolean;
    selectedOption?: string | number;
    errorMessage?: string;
}
