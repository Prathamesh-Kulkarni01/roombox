/**
 * Workflow Engine - Type Definitions
 * 
 * Defines the structure for dynamic, context-aware workflows
 */

export type StepType = 'menu' | 'form' | 'display' | 'input' | 'confirmation';
export type OptionType = 'static' | 'dynamic' | 'dynamic-list';

export interface WorkflowOption {
    key: string | number;
    label: string;
    target?: string;  // Next step
    action?: string;  // Custom action
    condition?: (context: WorkflowContext) => boolean;
}

export interface StepDefinition {
    id: string;
    type: StepType;
    label: string;
    
    // Message generation
    messageTemplate: string;  // Supports {{variable}} interpolation
    messageBuilder?: (context: WorkflowContext) => string;
    
    // Options
    options?: WorkflowOption[];
    optionsSource?: 'static' | 'dynamic'; // dynamic = generate at runtime
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
    nextSteps?: {
        [input: string]: string;  // input -> next step ID
    };
    nextStepsFn?: (input: string, context: WorkflowContext) => Promise<string>;
    defaultNext?: string;
    
    // Callbacks
    onEnter?: (context: WorkflowContext) => Promise<void>;
    onExit?: (context: WorkflowContext) => Promise<void>;
    onComplete?: (context: WorkflowContext) => Promise<any>;
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
    entryPoint: string;  // First step
    steps: { [stepId: string]: StepDefinition };
    rules?: WorkflowRule[];
    timeout?: number;  // In seconds
}

export interface WorkflowRule {
    condition: (context: WorkflowContext) => boolean;
    action: 'forward' | 'backward' | 'jump' | 'exit';
    target?: string;
}

export interface WorkflowContext {
    // Workflow info
    workflowId: string;
    currentStep: string;
    
    // History
    stepHistory: string[];
    inputHistory: string[];
    
    // Data
    data: { [key: string]: any };
    
    // UI state
    lastMessage: string;
    availableOptions: (string | number)[];
    
    // User
    userId: string;
    userPhone: string;
    
    // Metadata
    createdAt: Date;
    updatedAt: Date;
    sessionId: string;
}

export interface WorkflowResult {
    success: boolean;
    message: string;
    nextStep?: string;
    context: WorkflowContext;
    data?: any;
    error?: string;
}

export interface ParsedInput {
    raw: string;
    normalized: string;
    isValid: boolean;
    selectedOption?: string | number;
    errorMessage?: string;
}
