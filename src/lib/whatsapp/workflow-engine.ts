/**
 * Intelligent Workflow Engine
 * 
 * Core logic for dynamic, context-aware conversation flows
 */

import {
    WorkflowDefinition,
    WorkflowContext,
    WorkflowResult,
    ParsedInput,
    StepDefinition,
    WorkflowOption
} from './workflow-types';

export class WorkflowEngine {
    private workflows: Map<string, WorkflowDefinition> = new Map();

    /**
     * Register a workflow definition
     */
    registerWorkflow(definition: WorkflowDefinition): void {
        this.workflows.set(definition.id, definition);
        console.log(`[WorkflowEngine] Registered workflow: ${definition.id}`);
    }

    /**
     * Get workflow definition
     */
    getWorkflow(workflowId: string): WorkflowDefinition | undefined {
        return this.workflows.get(workflowId);
    }

    /**
     * Get current step definition
     */
    getStep(workflow: WorkflowDefinition, stepId: string): StepDefinition | undefined {
        return workflow.steps[stepId];
    }

    /**
     * Parse and validate user input based on current step
     */
    async parseInput(
        input: string,
        step: StepDefinition,
        context: WorkflowContext
    ): Promise<ParsedInput> {
        const normalized = input.trim().toLowerCase();

        // Check if input matches validation regex
        if (step.validation?.regex) {
            if (!step.validation.regex.test(input)) {
                return {
                    raw: input,
                    normalized,
                    isValid: false,
                    errorMessage: step.validation.errorMessage || 'Invalid input'
                };
            }
        }

        // Custom validator
        if (step.validation?.customValidator) {
            const isValid = step.validation.customValidator(input, context);
            if (!isValid) {
                return {
                    raw: input,
                    normalized,
                    isValid: false,
                    errorMessage: step.validation.errorMessage || 'Invalid input'
                };
            }
        }

        // Check if input matches available options
        if (step.options && step.options.length > 0) {
            const selectedOption = step.options.find(
                opt => opt.key.toString().toLowerCase() === normalized ||
                       opt.label.toLowerCase().includes(normalized)
            );
            
            if (selectedOption) {
                return {
                    raw: input,
                    normalized,
                    isValid: true,
                    selectedOption: selectedOption.key
                };
            }
        }

        return {
            raw: input,
            normalized,
            isValid: true  // Default valid if no validation specified
        };
    }

    /**
     * Generate message for current step
     */
    async generateMessage(step: StepDefinition, context: WorkflowContext): Promise<string> {
        let message = '';

        // Use custom builder if available
        if (step.messageBuilder) {
            message = step.messageBuilder(context);
        } else {
            // Interpolate template variables
            message = this.interpolateTemplate(step.messageTemplate, context);
        }

        // Append options if available
        if (step.options && step.options.length > 0) {
            message += '\n\n';
            step.options.forEach(opt => {
                message += `${opt.key}️⃣ ${opt.label}\n`;
            });
        }

        // If dynamic options, generate them
        if (step.optionsFn) {
            const dynamicOptions = await step.optionsFn(context);
            message += '\n\n';
            dynamicOptions.forEach(opt => {
                message += `${opt.key}️⃣ ${opt.label}\n`;
            });
            // Update context with available options
            context.availableOptions = dynamicOptions.map(opt => opt.key);
        }

        return message;
    }

    /**
     * Determine next step based on input and context
     */
    async getNextStep(
        step: StepDefinition,
        parsedInput: ParsedInput,
        context: WorkflowContext
    ): Promise<string | undefined> {
        // Use custom function if available
        if (step.nextStepsFn) {
            return await step.nextStepsFn(parsedInput.raw, context);
        }

        // Check static routing
        if (step.nextSteps) {
            // Try exact match first
            if (step.nextSteps[parsedInput.raw]) {
                return step.nextSteps[parsedInput.raw];
            }

            // Try normalized input
            if (step.nextSteps[parsedInput.normalized]) {
                return step.nextSteps[parsedInput.normalized];
            }

            // Try by option key
            if (step.nextSteps[parsedInput.selectedOption?.toString() || '']) {
                return step.nextSteps[parsedInput.selectedOption!.toString()];
            }
        }

        // Fall back to default
        return step.defaultNext;
    }

    /**
     * Initialize workflow context
     */
    initializeContext(
        workflowId: string,
        userId: string,
        userPhone: string
    ): WorkflowContext {
        const workflow = this.getWorkflow(workflowId);
        if (!workflow) {
            throw new Error(`Workflow not found: ${workflowId}`);
        }

        return {
            workflowId,
            currentStep: workflow.entryPoint,
            stepHistory: [workflow.entryPoint],
            inputHistory: [],
            data: {},
            lastMessage: '',
            availableOptions: [],
            userId,
            userPhone,
            createdAt: new Date(),
            updatedAt: new Date(),
            sessionId: `${userId}-${Date.now()}`
        };
    }

    /**
     * Process user input and advance workflow
     */
    async processInput(
        userInput: string,
        context: WorkflowContext
    ): Promise<WorkflowResult> {
        try {
            const workflow = this.getWorkflow(context.workflowId);
            if (!workflow) {
                return {
                    success: false,
                    message: '❌ Workflow not found',
                    context,
                    error: 'Invalid workflow ID'
                };
            }

            const currentStep = this.getStep(workflow, context.currentStep);
            if (!currentStep) {
                return {
                    success: false,
                    message: '❌ Step not found',
                    context,
                    error: 'Invalid step ID'
                };
            }

            // Parse input
            const parsedInput = await this.parseInput(userInput, currentStep, context);

            // Validation failed
            if (!parsedInput.isValid) {
                return {
                    success: false,
                    message: `⚠️ ${parsedInput.errorMessage}`,
                    context,
                    error: parsedInput.errorMessage
                };
            }

            // Save input to history
            context.inputHistory.push(userInput);

            // Store data if it's a form/input step
            if (currentStep.type === 'form' || currentStep.type === 'input') {
                const fieldId = currentStep.formFields?.[currentStep.currentFieldIndex || 0]?.id;
                if (fieldId) {
                    context.data[fieldId] = userInput;
                }
            }

            // Get next step
            const nextStepId = await this.getNextStep(currentStep, parsedInput, context);

            if (!nextStepId) {
                return {
                    success: true,
                    message: '✅ Workflow completed',
                    context,
                    data: context.data
                };
            }

            const nextStep = this.getStep(workflow, nextStepId);
            if (!nextStep) {
                return {
                    success: false,
                    message: '❌ Invalid next step',
                    context,
                    error: `Step not found: ${nextStepId}`
                };
            }

            // Call exit handler for current step
            if (currentStep.onExit) {
                await currentStep.onExit(context);
            }

            // Update context
            context.currentStep = nextStepId;
            context.stepHistory.push(nextStepId);
            context.updatedAt = new Date();

            // Call enter handler for next step
            if (nextStep.onEnter) {
                await nextStep.onEnter(context);
            }

            // Generate message for next step
            const message = await this.generateMessage(nextStep, context);

            return {
                success: true,
                message,
                nextStep: nextStepId,
                context,
                data: context.data
            };

        } catch (error: any) {
            return {
                success: false,
                message: '❌ Error processing workflow',
                context,
                error: error.message
            };
        }
    }

    /**
     * Helper: Interpolate template variables
     */
    private interpolateTemplate(template: string, context: WorkflowContext): string {
        return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return context.data[key]?.toString() || match;
        });
    }

    /**
     * Get workflow summary
     */
    getWorkflowSummary(context: WorkflowContext): string {
        return `
📋 Workflow: ${context.workflowId}
📍 Current Step: ${context.currentStep}
📝 History: ${context.stepHistory.join(' → ')}
💾 Data: ${JSON.stringify(context.data, null, 2)}
        `.trim();
    }
}

// Export singleton instance
export const workflowEngine = new WorkflowEngine();
