/**
 * Workflow Engine
 *
 * Drives all WhatsApp conversation flows from declarative definitions.
 * No if/else chains — pure data-driven routing.
 */

import {
    WorkflowDefinition,
    WorkflowContext,
    WorkflowResult,
    ParsedInput,
    StepDefinition,
} from './workflow-types';

export class WorkflowEngine {
    private workflows: Map<string, WorkflowDefinition> = new Map();

    registerWorkflow(definition: WorkflowDefinition): void {
        this.workflows.set(definition.id, definition);
    }

    getWorkflow(workflowId: string): WorkflowDefinition | undefined {
        return this.workflows.get(workflowId);
    }

    getStep(workflow: WorkflowDefinition, stepId: string): StepDefinition | undefined {
        return workflow.steps[stepId];
    }

    // ─── Input Parsing & Validation ──────────────────────────────────

    async parseInput(
        input: string,
        step: StepDefinition,
        context: WorkflowContext
    ): Promise<ParsedInput> {
        const normalized = input.trim().toLowerCase();

        // Regex validation
        if (step.validation?.regex) {
            if (!step.validation.regex.test(input.trim())) {
                return {
                    raw: input, normalized, isValid: false,
                    errorMessage: step.validation.errorMessage || 'Invalid input.',
                };
            }
        }

        // Custom validator
        if (step.validation?.customValidator) {
            const valid = step.validation.customValidator(input.trim(), context);
            if (!valid) {
                return {
                    raw: input, normalized, isValid: false,
                    errorMessage: step.validation.errorMessage || 'Invalid input.',
                };
            }
        }

        // Match static options by key
        if (step.options) {
            const selected = step.options.find(
                (opt) =>
                    opt.key.toString().toLowerCase() === normalized ||
                    opt.label.toLowerCase() === normalized
            );
            if (selected) {
                return { raw: input, normalized, isValid: true, selectedOption: selected.key };
            }
        }

        return { raw: input, normalized, isValid: true };
    }

    // ─── Message Generation ───────────────────────────────────────────

    async generateMessage(step: StepDefinition, context: WorkflowContext): Promise<string> {
        let message = '';

        if (step.messageBuilder) {
            message = step.messageBuilder(context);
        } else if (step.messageTemplate) {
            message = this.interpolate(step.messageTemplate, context);
        }

        // Append static options
        if (step.options && step.options.length > 0) {
            message += '\n\n';
            step.options.forEach((opt) => {
                message += `${opt.key}️⃣ ${opt.label}\n`;
            });
        }

        // Generate dynamic options
        if (step.optionsFn) {
            const dynOpts = await step.optionsFn(context);
            if (dynOpts.length > 0) {
                message += message.trim() ? '\n\n' : '';
                dynOpts.forEach((opt) => {
                    message += `${opt.key}️⃣ ${opt.label}\n`;
                });
                context.availableOptions = dynOpts.map((o) => o.key);
            }
        }

        return message.trim();
    }

    // ─── Next Step Resolution ─────────────────────────────────────────

    async getNextStep(
        step: StepDefinition,
        parsedInput: ParsedInput,
        context: WorkflowContext
    ): Promise<string | undefined> {
        // Dynamic function wins
        if (step.nextStepsFn) {
            return await step.nextStepsFn(parsedInput.raw.trim(), context);
        }

        // Static map — try raw, normalized, then selectedOption
        if (step.nextSteps) {
            const key = parsedInput.raw.trim();
            if (step.nextSteps[key]) return step.nextSteps[key];
            if (step.nextSteps[parsedInput.normalized]) return step.nextSteps[parsedInput.normalized];
            if (
                parsedInput.selectedOption !== undefined &&
                step.nextSteps[parsedInput.selectedOption.toString()]
            ) {
                return step.nextSteps[parsedInput.selectedOption.toString()];
            }
        }

        return step.defaultNext;
    }

    // ─── Context Initialization ───────────────────────────────────────

    initializeContext(
        workflowId: string,
        userId: string,
        userPhone: string,
        authData: Partial<WorkflowContext> = {}
    ): WorkflowContext {
        const workflow = this.getWorkflow(workflowId);
        if (!workflow) throw new Error(`Workflow not found: ${workflowId}`);

        return {
            workflowId,
            currentStep: workflow.entryPoint,
            stepHistory: [workflow.entryPoint],
            inputHistory: [],
            data: {},
            lastMessage: '',
            availableOptions: [],
            isAuthenticatedOwner: false,
            isAuthenticatedTenant: false,
            userId,
            userPhone,
            createdAt: new Date(),
            updatedAt: new Date(),
            sessionId: `${userId}-${Date.now()}`,
            ...authData,
        };
    }

    // ─── Core: Process User Input ─────────────────────────────────────

    async processInput(
        userInput: string,
        context: WorkflowContext
    ): Promise<WorkflowResult> {
        try {
            const workflow = this.getWorkflow(context.workflowId);
            if (!workflow) {
                return { success: false, message: '❌ Workflow not found. Reply *Menu* to restart.', context };
            }

            const currentStep = this.getStep(workflow, context.currentStep);
            if (!currentStep) {
                return { success: false, message: '❌ Invalid step. Reply *Menu* to restart.', context };
            }

            // Validate input
            const parsed = await this.parseInput(userInput, currentStep, context);
            if (!parsed.isValid) {
                return { success: false, message: `⚠️ ${parsed.errorMessage}`, context };
            }

            // Record history
            context.inputHistory.push(userInput);

            // Determine next step
            const nextStepId = await this.getNextStep(currentStep, parsed, context);

            // Call exit handler
            if (currentStep.onExit) await currentStep.onExit(context);

            if (!nextStepId) {
                // Workflow naturally completed
                return { success: true, message: '✅ Done! Reply *Menu* to continue.', context, data: context.data };
            }

            // Handle special cross-workflow navigation tokens
            if (nextStepId.startsWith('__')) {
                return { success: true, message: '', nextStep: nextStepId, context };
            }

            const nextStep = this.getStep(workflow, nextStepId);
            if (!nextStep) {
                return { success: false, message: `❌ Step "${nextStepId}" not found. Reply *Menu*.`, context };
            }

            // Advance context
            context.currentStep = nextStepId;
            context.stepHistory.push(nextStepId);
            context.updatedAt = new Date();

            // Run onEnter for next step (loads data, etc.)
            if (nextStep.onEnter) await nextStep.onEnter(context);

            // Generate message
            const message = await this.generateMessage(nextStep, context);
            context.lastMessage = message;

            return { success: true, message, nextStep: nextStepId, context, data: context.data };

        } catch (err: any) {
            console.error('[WorkflowEngine] Error:', err);
            return { success: false, message: `❌ Something went wrong: ${err.message}`, context };
        }
    }

    // ─── Display Current Step (entry into a step) ─────────────────────

    async presentStep(context: WorkflowContext): Promise<string> {
        const workflow = this.getWorkflow(context.workflowId);
        if (!workflow) return '❌ Workflow not found. Reply *Menu*.';

        const step = this.getStep(workflow, context.currentStep);
        if (!step) return '❌ Step not found. Reply *Menu*.';

        // Run onEnter if presenting fresh
        if (step.onEnter) await step.onEnter(context);

        const message = await this.generateMessage(step, context);
        context.lastMessage = message;
        return message;
    }

    // ─── Helpers ─────────────────────────────────────────────────────

    private interpolate(template: string, context: WorkflowContext): string {
        return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
            return context.data[key]?.toString() ?? '';
        });
    }
}

// Singleton — pre-registers all workflows on import
import { allWorkflows } from './workflow-definitions';

export const workflowEngine = new WorkflowEngine();
allWorkflows.forEach((wf) => workflowEngine.registerWorkflow(wf));
